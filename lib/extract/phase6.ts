import Anthropic from "@anthropic-ai/sdk";
import { createMessageWithRetry } from "../anthropic/create-message";
import * as fs from "node:fs";
import * as path from "node:path";
import { assertApiPayloadWithinBudget, assertPdfWithinBudget, pdfSha256 } from "../anthropic/guard";
import { resolvePhase6PageSpec } from "./phase6-pages";
import { slicePdfByPageSpec } from "../pdf/pages";
import { PHASE_DIRS, SCHEMAS_DIR } from "../paths";
import type { Phase6RefsData } from "../types";
import { ensureJsonArray } from "./normalize";

const MODEL = "claude-sonnet-4-5";

const schema = JSON.parse(
  fs.readFileSync(path.join(SCHEMAS_DIR, "phase6_refs.json"), "utf-8")
);

const SYSTEM_PROMPT = `You are an extractor for Environmental Product Declarations (EPDs) following EN 15804.

Your task: read the attached EPD PDF excerpt and extract bibliography / references and any additional information blocks.

Rules:
- bibliography: one string per reference entry (norms, ISO standards, PCR, reports, URLs). Copy verbatim including edition years.
- additional_information: owner/responsible party blocks, contact details, general information sections — each as a separate string when distinct.
- Preserve bullet characters as text. Do not merge separate references into one string.
- If no bibliography is present, return an empty bibliography array.`;

export async function runPhase6(
  pdfPath: string,
  apiKey: string,
  _options: { force?: boolean } = {}
): Promise<Phase6RefsData> {
  const stem = path.basename(pdfPath, path.extname(pdfPath));
  assertPdfWithinBudget(pdfPath);

  const pageSpec = resolvePhase6PageSpec(stem);
  const slice = await slicePdfByPageSpec(pdfPath, pageSpec, { stem, export: true });
  assertApiPayloadWithinBudget(
    slice.byteSize,
    `Phase 6 slice (pages ${slice.pageRange})`
  );

  const fullSha256 = pdfSha256(pdfPath);
  const client = new Anthropic({ apiKey });
  const response = await createMessageWithRetry(client, {
    model: MODEL,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    tools: [
      {
        name: "record_epd_references",
        description: "Record bibliography and additional information. Call exactly once.",
        input_schema: schema as Anthropic.Tool.InputSchema,
      },
    ],
    tool_choice: { type: "tool", name: "record_epd_references" },
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
            text: `Extract bibliography and references from this EPD excerpt (pages ${slice.pages.join(", ")} of ${slice.totalPages}). Call record_epd_references.`,
          },
        ],
      },
    ],
  }, { label: "phase6" });

  const toolUse = response.content.find(
    (block) => block.type === "tool_use" && block.name === "record_epd_references"
  );

  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error(`No tool_use block in response. Stop reason: ${response.stop_reason}`);
  }

  const raw = toolUse.input as Omit<Phase6RefsData, "_source">;
  const result: Phase6RefsData = {
    bibliography: ensureJsonArray(raw.bibliography),
    additional_information: raw.additional_information
      ? ensureJsonArray(raw.additional_information)
      : null,
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

  fs.mkdirSync(PHASE_DIRS.phase6, { recursive: true });
  fs.writeFileSync(path.join(PHASE_DIRS.phase6, `${stem}.json`), JSON.stringify(result, null, 2));
  return result;
}
