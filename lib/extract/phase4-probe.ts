import Anthropic from "@anthropic-ai/sdk";
import { createMessageWithRetry } from "../anthropic/create-message";
import * as fs from "node:fs";
import * as path from "node:path";
import { assertApiPayloadWithinBudget, assertPdfWithinBudget, pdfSha256 } from "../anthropic/guard";
import { resolvePhase4PageSpec } from "./phase4-pages";
import { slicePdfByPageSpec } from "../pdf/pages";
import { SCHEMAS_DIR } from "../paths";
import { phase4ProbeDir, phase4ProbeOutputPath } from "./phase4-probe-path";
import {
  buildLcaCanonicalGrid,
  LCA_CANONICAL_MODULES,
} from "../lca/canonical-grid";
import type { Phase4LcaProbeData } from "../types";
import { ensureJsonArray } from "./normalize";

const MODEL = "claude-sonnet-4-5";
const PROBE_DIR = phase4ProbeDir();

const schema = JSON.parse(
  fs.readFileSync(path.join(SCHEMAS_DIR, "phase4_lca.probe.json"), "utf-8")
);

const SYSTEM_PROMPT = `You are an extractor for Environmental Product Declarations (EPDs) following EN 15804.

Your task: read the attached EPD PDF excerpt and capture an LCA results table as structured data.

Critical layout notes:
- Use the standard EN 15804 grid template: rows = indicators (e.g. PERE, GWP-total), columns = lifecycle modules A1, A2, A3, A4, A5, B1–B7, C1–C4, D (then Total if printed).
- When the PDF shows separate columns for A1, A2, and A3, record three columns with codes "A1", "A2", "A3" — not a merged "A1/A2/A3" unless the PDF has only one combined column.
- Column headers are often rotated 90° (vertical text). Read them carefully.
- Top-level grouped headers (Production, Construction process stage, Use stage, End-of-life stage, etc.) span multiple columns — record these in column_groups.
- Row labels: short indicator code on the first line; unit in parentheses on the second line (store unit in rows[].unit, indicator name in rows[].indicator).
- Cell values use scientific notation with comma decimal separator (e.g. "3,81E+01", "4,11E-01", "0,0").
- Preserve raw cell text exactly as printed.

Rules:
- columns: one entry per visible data column left to right, in order; code must be the module code (A1, A2, …) when identifiable.
- rows: one entry per indicator row; values array must align with columns (same count and order).
- column_code in values must match the corresponding columns[].code.
- capture.complete: true only if you captured every visible column header and every visible data row on the page.
- capture.notes: mention anything truncated, unreadable, or continuing on another page.
- introductory_text: full explanatory paragraphs on these pages that are not table cells (e.g. section 9.1 impact category explanations). Null if none.`;

export async function runPhase4Probe(
  pdfPath: string,
  apiKey: string,
  options: { force?: boolean; pageSpec?: string } = {}
): Promise<Phase4LcaProbeData> {
  const stem = path.basename(pdfPath, path.extname(pdfPath));
  assertPdfWithinBudget(pdfPath);

  const pageSpec = options.pageSpec ?? resolvePhase4PageSpec(stem);
  const slice = await slicePdfByPageSpec(pdfPath, pageSpec, { stem, export: true });
  assertApiPayloadWithinBudget(
    slice.byteSize,
    `Phase 4 probe slice (pages ${slice.pageRange})`
  );

  const fullSha256 = pdfSha256(pdfPath);
  const client = new Anthropic({ apiKey });
  const response = await createMessageWithRetry(client, {
    model: MODEL,
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    tools: [
      {
        name: "record_lca_table_probe",
        description: "Record extracted LCA table structure. Call exactly once.",
        input_schema: schema as Anthropic.Tool.InputSchema,
      },
    ],
    tool_choice: { type: "tool", name: "record_lca_table_probe" },
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
            text: `Extract the LCA table from this EPD excerpt (pages ${slice.pages.join(", ")} of ${slice.totalPages}). Include all rotated column headers and all data rows visible on the page. Call record_lca_table_probe.`,
          },
        ],
      },
    ],
  }, { label: "phase4-probe" });

  const toolUse = response.content.find(
    (block) => block.type === "tool_use" && block.name === "record_lca_table_probe"
  );

  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error(`No tool_use block in response. Stop reason: ${response.stop_reason}`);
  }

  const raw = toolUse.input as Omit<Phase4LcaProbeData, "_source">;
  const draft: Phase4LcaProbeData = {
    table_title: raw.table_title,
    table_type: raw.table_type,
    introductory_text:
      typeof raw.introductory_text === "string" ? raw.introductory_text.trim() || null : null,
    column_groups: ensureJsonArray(raw.column_groups),
    columns: ensureJsonArray(raw.columns),
    rows: ensureJsonArray(raw.rows).map((row) => ({
      ...row,
      values: ensureJsonArray(row.values),
    })),
    capture: raw.capture,
    _source: undefined,
  };

  const grid = buildLcaCanonicalGrid(draft);
  const result: Phase4LcaProbeData = {
    ...draft,
    capture: {
      ...draft.capture,
      column_count: LCA_CANONICAL_MODULES.length + grid.extraColumns.length,
      row_count: grid.rows.length,
    },
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

  const outPath = phase4ProbeOutputPath(stem, pageSpec);
  fs.mkdirSync(PROBE_DIR, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  return result;
}
