import Anthropic from "@anthropic-ai/sdk";
import { createMessageWithRetry } from "../anthropic/create-message";
import * as fs from "node:fs";
import * as path from "node:path";
import { loadPhase3Composition } from "../data";
import { assertApiPayloadWithinBudget, assertPdfWithinBudget, pdfSha256 } from "../anthropic/guard";
import { parseCompositionFromPdf } from "./composition-parse";
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

function writeComposition(stem: string, result: Phase3CompositionData): void {
  fs.mkdirSync(PHASE_DIRS.phase3_composition, { recursive: true });
  fs.writeFileSync(
    path.join(PHASE_DIRS.phase3_composition, `${stem}.json`),
    JSON.stringify(result, null, 2)
  );
}

export async function runPhase3Composition(
  pdfPath: string,
  apiKey: string | undefined,
  options: { force?: boolean } = {}
): Promise<Phase3CompositionData> {
  const stem = path.basename(pdfPath, path.extname(pdfPath));
  assertPdfWithinBudget(pdfPath);
  const fullSha256 = pdfSha256(pdfPath);
  const pageSpec = resolvePhase3CompositionPageSpec(stem);

  const previous = options.force ? null : loadPhase3Composition(stem);
  const parsed = await parseCompositionFromPdf(pdfPath, pageSpec);

  const key = apiKey?.trim();
  if (!key) {
    if (!parsed?.components.length) {
      throw new Error(
        "ANTHROPIC_API_KEY is required for composition when the PDF table parser finds no three-column header."
      );
    }
    const result: Phase3CompositionData = {
      components: parsed.components,
      declarations: parsed.declarations ?? previous?.declarations ?? null,
      _source: {
        pdf_filename: path.basename(pdfPath),
        pdf_sha256: fullSha256,
        api_pages: pageSpec,
        api_pages_resolved: pageSpec,
        extracted_by: "pdf-composition-table-parser",
        extracted_at: new Date().toISOString(),
        model: null,
        input_tokens: 0,
        output_tokens: 0,
      },
    };
    writeComposition(stem, result);
    return result;
  }

  if (parsed?.components.length) {
    const parserOnly: Phase3CompositionData = {
      components: parsed.components,
      declarations: parsed.declarations,
      _source: {
        pdf_filename: path.basename(pdfPath),
        pdf_sha256: fullSha256,
        api_pages: pageSpec,
        api_pages_resolved: pageSpec,
        extracted_by: "pdf-composition-table-parser",
        extracted_at: new Date().toISOString(),
        model: null,
        input_tokens: 0,
        output_tokens: 0,
      },
    };
    writeComposition(stem, parserOnly);
    return parserOnly;
  }

  const slice = await slicePdfByPageSpec(pdfPath, pageSpec, { stem, export: true });
  assertApiPayloadWithinBudget(
    slice.byteSize,
    `Phase 3 composition slice (pages ${slice.pageRange})`
  );

  const client = new Anthropic({ apiKey: key });
  const response = await createMessageWithRetry(client, {
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
  }, { label: "phase3-composition" });

  const toolUse = response.content.find(
    (block) => block.type === "tool_use" && block.name === "record_epd_composition"
  );

  if (!toolUse || toolUse.type !== "tool_use") {
    if (parsed?.components.length) {
      const fallback: Phase3CompositionData = {
        components: parsed.components,
        declarations: parsed.declarations,
        _source: {
          pdf_filename: path.basename(pdfPath),
          pdf_sha256: fullSha256,
          api_pages: pageSpec,
          api_pages_resolved: pageSpec,
          extracted_by: "pdf-composition-table-parser",
          extracted_at: new Date().toISOString(),
          model: null,
          input_tokens: 0,
          output_tokens: 0,
        },
      };
      writeComposition(stem, fallback);
      return fallback;
    }
    throw new Error(`No tool_use block in response. Stop reason: ${response.stop_reason}`);
  }

  const raw = toolUse.input as Omit<Phase3CompositionData, "_source">;
  const result: Phase3CompositionData = {
    components:
      parsed?.components.length && (!raw.components?.length || raw.components.length < parsed.components.length)
        ? parsed.components
        : raw.components,
    declarations: raw.declarations?.length ? raw.declarations : parsed?.declarations ?? null,
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
      extracted_by: parsed?.components.length
        ? "claude-api+pdf-composition-table-parser"
        : "claude-api",
      extracted_at: new Date().toISOString(),
      model: MODEL,
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    },
  };

  writeComposition(stem, result);
  return result;
}
