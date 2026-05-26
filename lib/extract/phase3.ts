import Anthropic from "@anthropic-ai/sdk";
import * as fs from "node:fs";
import * as path from "node:path";
import { assertApiPayloadWithinBudget, assertPdfWithinBudget, pdfSha256 } from "../anthropic/guard";
import { resolvePhase3PageSpec } from "./phase3-pages";
import { slicePdfByPageSpec } from "../pdf/pages";
import { PHASE_DIRS, SCHEMAS_DIR } from "../paths";
import type { Phase3ProductData } from "../types";

const MODEL = "claude-sonnet-4-5";

const schema = JSON.parse(
  fs.readFileSync(path.join(SCHEMAS_DIR, "phase3_product.json"), "utf-8")
);

const SYSTEM_PROMPT = `You are an extractor for Environmental Product Declarations (EPDs) following EN 15804.

Your task: read the attached EPD PDF excerpt and extract product identification fields from section 1 (product description) and section 2 (technical data / physical characteristics).

Rules:
- Copy text verbatim where possible. Do not paraphrase product names or technical values.
- description: the main product description paragraph(s) from section 1.2, not the cover title alone.
- intended_use: application / use case text when present as a distinct block.
- reference_flow: declared unit / reference flow from section 1.3 — value and unit when numeric, plus the full sentence in description.
- installation: section 1.4 installation notes when present.
- reference_service_life_years: integer years only from section 1.6; null if not stated.
- geographical_representativity: section 1.7 text when present.
- production_process: section 1.8 summary when present.
- technical_properties: every row from the technical data table (section 2). One object per row with property name, standard reference, value, unit, and comment column if present.
- declared_unit.unit: use short symbols (m2, m3, kg, mm, W/(mK)) without Unicode superscripts.
- If a field or table is not in the excerpt, set it to null or an empty array. Do not guess.`;

export async function runPhase3(
  pdfPath: string,
  apiKey: string,
  _options: { force?: boolean } = {}
): Promise<Phase3ProductData> {
  const stem = path.basename(pdfPath, path.extname(pdfPath));
  assertPdfWithinBudget(pdfPath);

  const pageSpec = resolvePhase3PageSpec(stem);
  const slice = await slicePdfByPageSpec(pdfPath, pageSpec, { stem, export: true });
  assertApiPayloadWithinBudget(
    slice.byteSize,
    `Phase 3 slice (pages ${slice.pageRange})`
  );

  const fullSha256 = pdfSha256(pdfPath);
  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    tools: [
      {
        name: "record_epd_product",
        description:
          "Record extracted product identification and technical data. Call exactly once.",
        input_schema: schema as Anthropic.Tool.InputSchema,
      },
    ],
    tool_choice: { type: "tool", name: "record_epd_product" },
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
            text: `Extract product identification (§1) and technical data (§2) from this EPD excerpt (pages ${slice.pages.join(", ")} of ${slice.totalPages}). Call record_epd_product with the results.`,
          },
        ],
      },
    ],
  });

  const toolUse = response.content.find(
    (block) => block.type === "tool_use" && block.name === "record_epd_product"
  );

  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error(`No tool_use block in response. Stop reason: ${response.stop_reason}`);
  }

  const result: Phase3ProductData = {
    ...(toolUse.input as Omit<Phase3ProductData, "_source">),
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

  fs.mkdirSync(PHASE_DIRS.phase3, { recursive: true });
  fs.writeFileSync(path.join(PHASE_DIRS.phase3, `${stem}.json`), JSON.stringify(result, null, 2));
  return result;
}
