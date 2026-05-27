import Anthropic from "@anthropic-ai/sdk";
import { createMessageWithRetry } from "../anthropic/create-message";
import * as fs from "node:fs";
import * as path from "node:path";
import { assertApiPayloadWithinBudget, assertPdfWithinBudget, pdfSha256 } from "../anthropic/guard";
import { enrichPhase2Data } from "./phase2-enrich";
import { resolvePhase2PageSpec } from "./phase2-pages";
import { slicePdfByPageSpec } from "../pdf/pages";
import { loadPhase7 } from "../data";
import { PHASE_DIRS, SCHEMAS_DIR } from "../paths";
import { writeDraftOutputs } from "../templates";
import { loadPhase1 } from "../data";
import type { Phase2Data } from "../types";

const MODEL = "claude-sonnet-4-5";

const schema = JSON.parse(
  fs.readFileSync(path.join(SCHEMAS_DIR, "phase2_header.json"), "utf-8")
);

const SYSTEM_PROMPT = `You are an extractor for Environmental Product Declarations (EPDs) following EN 15804 and ISO 14025.

Your task: read the attached PDF excerpt and extract declaration cover metadata into the tool schema.

The first page(s) are the EPD cover sheet (B-EPD, ETEX, INIES, etc.): logos, product title, registration number, program operator, MODULES DECLARED grid, declared unit, issue/expiry dates, PCR line, verification badge. Read that page carefully.

If a later page in the same excerpt shows a verifier name or signature block (often §12 Demonstration of verification), fill verifier.name from that page.

Rules:
- Return values exactly as they appear in the document. Do not normalize or paraphrase product names.
- program_operator: full legal name as printed (e.g. "Federal Public Service of Health, Food Chain Safety and Environment"). Never substitute abbreviations like BE-BD or B-EPD for this field.
- program_operator_code: short label only when explicitly shown (e.g. "B-EPD", "BE-BD", "BBD"); otherwise null.
- verifier.name: person name with organisation in parentheses when shown, e.g. "Evert Vermaut (Vincotte)".
- product_name: main title on the cover. product_description: secondary product type line when separate from declared_scope.
- declared_scope: verbatim cover line combining declared unit and product application, when shown as one sentence under MODULES DECLARED.
- declared_modules: list every lifecycle module code (A1, A2, A3, A4, A5, B1–B7, C1–C4, D) that is marked declared on the cover; use A1, A2, A3 not A1-A3 unless the PDF groups them.
- standards_conformity: copy the full "Conform to …" line when present (ETEX-style covers).
- conformity_basis: copy the "in accordance with …" line under the verification badge when present (B-EPD-style covers).
- verification_statement: copy the verification badge text verbatim, e.g. "Third party verified" or "THIRD PARTY VERIFIED".
- pcr_reference: copy the full PCR standard title from the cover, not an abbreviated code alone.
- Dates must be ISO format YYYY-MM-DD. If only month/year is given, use the first day of the month.
- validity.valid_until: use the explicit "valid until" / expiry date on the cover. Do not copy the issue date into valid_until unless the PDF shows the same date for both.
- Country codes must be ISO 3166-1 alpha-2 (e.g. BE, NL, DE, FR).
- declared_unit.unit: use a short symbol form (m3, m2, kg, t, piece, m, kWh). No spaces, no Unicode superscripts.
- If a field is not present in the document or you are not confident, set it to null. Do not guess.
- For verifier.type: "independent_third_party" if the EPD explicitly mentions external/independent verification per EN 15804 section 8.1.3; "internal" if it states internal verification; otherwise "unknown".`;

export async function runPhase2(
  pdfPath: string,
  apiKey: string,
  _options: { force?: boolean } = {}
): Promise<Phase2Data> {
  const stem = path.basename(pdfPath, path.extname(pdfPath));
  assertPdfWithinBudget(pdfPath);

  const pageSpec = resolvePhase2PageSpec(stem);
  const slice = await slicePdfByPageSpec(pdfPath, pageSpec, { stem });
  assertApiPayloadWithinBudget(
    slice.byteSize,
    `Phase 2 slice (pages ${slice.pageRange})`
  );

  const fullSha256 = pdfSha256(pdfPath);
  const client = new Anthropic({ apiKey });
  const response = await createMessageWithRetry(client, {
    model: MODEL,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    tools: [
      {
        name: "record_epd_header",
        description:
          "Record the extracted EPD header metadata. Call this exactly once with all fields filled in.",
        input_schema: schema as Anthropic.Tool.InputSchema,
      },
    ],
    tool_choice: { type: "tool", name: "record_epd_header" },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: slice.bytes.toString("base64"),
            },
          },
          {
            type: "text",
            text: `Extract cover & declaration metadata from this excerpt (PDF pages ${slice.pages.join(", ")} of ${slice.totalPages}). Page 1 is the cover sheet when it is included. Call record_epd_header once with all fields you can read.`,
          },
        ],
      },
    ],
  }, { label: "phase2" });

  const toolUse = response.content.find(
    (block) => block.type === "tool_use" && block.name === "record_epd_header"
  );

  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error(`No tool_use block in response. Stop reason: ${response.stop_reason}`);
  }

  const raw = toolUse.input as Omit<Phase2Data, "_source">;
  const enriched =
    enrichPhase2Data(raw as Phase2Data, loadPhase7(stem)) ?? (raw as Phase2Data);
  const result: Phase2Data = {
    ...enriched,
    _source: {
      pdf_filename: path.basename(pdfPath),
      pdf_sha256: fullSha256,
      api_pages: pageSpec,
      api_pages_resolved: slice.pageRange,
      api_pdf_bytes: slice.byteSize,
      api_pdf_sha256: slice.sha256,
      api_pdf_slice: slice.exportPath
        ? path.relative(process.cwd(), slice.exportPath)
        : null,
      extracted_by: "claude-api",
      extracted_at: new Date().toISOString(),
      model: MODEL,
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    },
  };

  fs.mkdirSync(PHASE_DIRS.phase2, { recursive: true });
  fs.writeFileSync(path.join(PHASE_DIRS.phase2, `${stem}.json`), JSON.stringify(result, null, 2));

  writeDraftOutputs(stem, { phase1: loadPhase1(stem), phase2: result });
  return result;
}
