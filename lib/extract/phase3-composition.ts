import Anthropic from "@anthropic-ai/sdk";
import * as fs from "node:fs";
import * as path from "node:path";
import { assertApiPayloadWithinBudget, assertPdfWithinBudget, pdfSha256 } from "../anthropic/guard";
import { resolvePhase3CompositionPageSpec } from "./phase3-composition-pages";
import { slicePdfByPageSpec } from "../pdf/pages";
import { PHASE_DIRS, SCHEMAS_DIR } from "../paths";
import type { Phase3CompositionData } from "../types";

const MODEL = "claude-sonnet-4-5";

const schema = JSON.parse(
  fs.readFileSync(path.join(SCHEMAS_DIR, "phase3_composition.json"), "utf-8")
);

const SYSTEM_PROMPT = `You are an extractor for Environmental Product Declarations (EPDs) following EN 15804.

Your task: read the attached EPD PDF excerpt and extract the composition and content table (section 1.5).

Rules:
- components: one row per line in the composition table. Map columns to section, component, composition, quantity.
- section: use the table section label when rows are grouped (e.g. "Product", "Fixation materials", "Packaging"). Null if not grouped.
- component: material or item name from the first column.
- composition: content/ingredients/percentage text from the middle column(s).
- quantity: numeric quantity column when present; copy verbatim including units (%, kg, p, NA).
- Include packaging rows and auxiliary materials when in the same table.
- declarations: copy any verbatim statements below the table (e.g. SVHC / Candidate list notes) as separate strings.
- Copy values exactly as printed. Do not normalize ranges or units.
- If the composition table is not in the excerpt, return an empty components array and null declarations.`;

export async function runPhase3Composition(
  pdfPath: string,
  apiKey: string,
  _options: { force?: boolean } = {}
): Promise<Phase3CompositionData> {
  const stem = path.basename(pdfPath, path.extname(pdfPath));
  assertPdfWithinBudget(pdfPath);

  const pageSpec = resolvePhase3CompositionPageSpec(stem);
  const slice = await slicePdfByPageSpec(pdfPath, pageSpec, { stem, export: true });
  assertApiPayloadWithinBudget(
    slice.byteSize,
    `Phase 3 composition slice (pages ${slice.pageRange})`
  );

  const fullSha256 = pdfSha256(pdfPath);
  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    tools: [
      {
        name: "record_epd_composition",
        description: "Record extracted composition table. Call exactly once.",
        input_schema: schema as Anthropic.Tool.InputSchema,
      },
    ],
    tool_choice: { type: "tool", name: "record_epd_composition" },
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
            text: `Extract the composition and content table (§1.5) from this EPD excerpt (pages ${slice.pages.join(", ")} of ${slice.totalPages}). Call record_epd_composition with the results.`,
          },
        ],
      },
    ],
  });

  const toolUse = response.content.find(
    (block) => block.type === "tool_use" && block.name === "record_epd_composition"
  );

  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error(`No tool_use block in response. Stop reason: ${response.stop_reason}`);
  }

  const result: Phase3CompositionData = {
    ...(toolUse.input as Omit<Phase3CompositionData, "_source">),
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

  fs.mkdirSync(PHASE_DIRS.phase3_composition, { recursive: true });
  fs.writeFileSync(
    path.join(PHASE_DIRS.phase3_composition, `${stem}.json`),
    JSON.stringify(result, null, 2)
  );
  return result;
}
