import Anthropic from "@anthropic-ai/sdk";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  assertApiPayloadWithinBudget,
  assertPdfWithinBudget,
  pdfSha256,
} from "../anthropic/guard";
import { phase2PageRange, slicePdfPages } from "../pdf/pages";
import { PHASE_DIRS, SCHEMAS_DIR } from "../paths";
import type { Phase2Data } from "../types";

const MODEL = "claude-sonnet-4-5";

const schema = JSON.parse(
  fs.readFileSync(path.join(SCHEMAS_DIR, "phase2_header.json"), "utf-8")
);

const SYSTEM_PROMPT = `You are an extractor for Environmental Product Declarations (EPDs) following EN 15804 and ISO 14025.

Your task: read the attached EPD PDF excerpt and extract the header-level metadata fields defined in the provided tool schema.

The attachment contains only the first pages of the full EPD (cover and general information). All header fields should appear in these pages.

Rules:
- Return values exactly as they appear in the document. Do not normalize or paraphrase product names.
- product_name: main title on the cover. product_description: secondary product type line when separate from declared_scope.
- declared_scope: verbatim cover line combining declared unit and product application, when shown as one sentence under MODULES DECLARED.
- declared_modules: list every lifecycle module code (A1, A2, A3, A4, A5, B1–B7, C1–C4, D) that is marked declared on the cover; use A1, A2, A3 not A1-A3 unless the PDF groups them.
- standards_conformity: copy the full "Conform to …" line when present (ETEX-style covers).
- conformity_basis: copy the "in accordance with …" line under the verification badge when present (B-EPD-style covers).
- verification_statement: copy the verification badge text verbatim, e.g. "Third party verified" or "THIRD PARTY VERIFIED".
- pcr_reference: copy the full PCR standard title from the cover, not an abbreviated code alone.
- Dates must be ISO format YYYY-MM-DD. If only month/year is given, use the first day of the month.
- Country codes must be ISO 3166-1 alpha-2 (e.g. BE, NL, DE, FR).
- declared_unit.unit: use a short symbol form (m3, m2, kg, t, piece, m, kWh). No spaces, no Unicode superscripts.
- If a field is not present in the document or you are not confident, set it to null. Do not guess.
- The EPD program operator for BEBD documents is typically "BE-BD" (also written "BBD" or "Belgian Building Declaration"). Use "BE-BD" as the canonical string.
- For verifier.type: "independent_third_party" if the EPD explicitly mentions external/independent verification per EN 15804 section 8.1.3; "internal" if it states internal verification; otherwise "unknown".`;

export async function runPhase2(
  pdfPath: string,
  apiKey: string,
  _options: { force?: boolean } = {}
): Promise<Phase2Data> {
  const stem = path.basename(pdfPath, path.extname(pdfPath));
  assertPdfWithinBudget(pdfPath);

  const pageSpec = phase2PageRange();
  const slice = await slicePdfPages(pdfPath, pageSpec, { stem });
  assertApiPayloadWithinBudget(
    slice.byteSize,
    `Phase 2 slice (pages ${slice.pageRange})`
  );

  const fullSha256 = pdfSha256(pdfPath);
  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
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
            text: `Extract the header metadata from this EPD excerpt (pages ${slice.pages.join(", ")} of ${slice.totalPages}) and call the record_epd_header tool with the results.`,
          },
        ],
      },
    ],
  });

  const toolUse = response.content.find(
    (block) => block.type === "tool_use" && block.name === "record_epd_header"
  );

  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error(`No tool_use block in response. Stop reason: ${response.stop_reason}`);
  }

  const result: Phase2Data = {
    ...(toolUse.input as Omit<Phase2Data, "_source">),
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
  return result;
}
