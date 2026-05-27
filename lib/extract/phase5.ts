import Anthropic from "@anthropic-ai/sdk";
import { createMessageWithRetry } from "../anthropic/create-message";
import * as fs from "node:fs";
import * as path from "node:path";
import { assertApiPayloadWithinBudget, assertPdfWithinBudget, pdfSha256 } from "../anthropic/guard";
import { resolvePhase5PageSpec } from "./phase5-pages";
import { slicePdfByPageSpec } from "../pdf/pages";
import { PHASE_DIRS, SCHEMAS_DIR } from "../paths";
import type { Phase5ScenariosData } from "../types";
import { ensureJsonArray } from "./normalize";

const MODEL = "claude-sonnet-4-5";

const schema = JSON.parse(
  fs.readFileSync(path.join(SCHEMAS_DIR, "phase5_scenarios.json"), "utf-8")
);

const SYSTEM_PROMPT = `You are an extractor for Environmental Product Declarations (EPDs) following EN 15804.

Your task: read the attached EPD PDF excerpt and extract lifecycle scenario assumptions (typically section 10 — details of underlying scenarios).

Rules:
- section_title: main heading of the scenarios section when present.
- scenarios: one entry per lifecycle module subsection (A1, A2, A3, A4, A5, B, C, D, etc.).
- module: EN 15804 module code (A1, A2, A3, A4, A5, B1-B7, C1-C4, D) when identifiable.
- number: subsection number when shown (e.g. "10.4").
- title: subsection heading.
- description: full scenario text for that module — copy verbatim, preserve bullet lists as plain text.
- If a module is grouped (e.g. B1-B7), use the group label as module when no finer split exists.
- If the excerpt has no scenario section, return empty scenarios array.`;

export async function runPhase5(
  pdfPath: string,
  apiKey: string,
  _options: { force?: boolean } = {}
): Promise<Phase5ScenariosData> {
  const stem = path.basename(pdfPath, path.extname(pdfPath));
  assertPdfWithinBudget(pdfPath);

  const pageSpec = resolvePhase5PageSpec(stem);
  const slice = await slicePdfByPageSpec(pdfPath, pageSpec, { stem, export: true });
  assertApiPayloadWithinBudget(
    slice.byteSize,
    `Phase 5 slice (pages ${slice.pageRange})`
  );

  const fullSha256 = pdfSha256(pdfPath);
  const client = new Anthropic({ apiKey });
  const response = await createMessageWithRetry(client, {
    model: MODEL,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    tools: [
      {
        name: "record_epd_scenarios",
        description: "Record extracted lifecycle scenarios. Call exactly once.",
        input_schema: schema as Anthropic.Tool.InputSchema,
      },
    ],
    tool_choice: { type: "tool", name: "record_epd_scenarios" },
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
            text: `Extract lifecycle scenario assumptions from this EPD excerpt (pages ${slice.pages.join(", ")} of ${slice.totalPages}). Call record_epd_scenarios.`,
          },
        ],
      },
    ],
  }, { label: "phase5" });

  const toolUse = response.content.find(
    (block) => block.type === "tool_use" && block.name === "record_epd_scenarios"
  );

  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error(`No tool_use block in response. Stop reason: ${response.stop_reason}`);
  }

  const raw = toolUse.input as Omit<Phase5ScenariosData, "_source">;
  const result: Phase5ScenariosData = {
    section_title: raw.section_title,
    scenarios: ensureJsonArray(raw.scenarios),
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

  fs.mkdirSync(PHASE_DIRS.phase5, { recursive: true });
  fs.writeFileSync(path.join(PHASE_DIRS.phase5, `${stem}.json`), JSON.stringify(result, null, 2));
  return result;
}
