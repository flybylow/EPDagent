import Anthropic from "@anthropic-ai/sdk";
import { createMessageWithRetry } from "../anthropic/create-message";
import * as fs from "node:fs";
import * as path from "node:path";
import { loadPhase3LcaStudy } from "../data";
import { assertApiPayloadWithinBudget, assertPdfWithinBudget, pdfSha256 } from "../anthropic/guard";
import {
  resolvePhase3LcaStudyPageSpec,
  resolveSystemBoundariesPageSpec,
} from "./phase3-lca-study-pages";
import { parseSystemBoundariesFromPdf } from "./system-boundaries-parse";
import { slicePdfByPageSpec } from "../pdf/pages";
import { PHASE_DIRS, SCHEMAS_DIR } from "../paths";
import type { Phase3LcaStudyData } from "../types";
import { ensureJsonArray } from "./normalize";

const MODEL = "claude-sonnet-4-5";

const schema = JSON.parse(
  fs.readFileSync(path.join(SCHEMAS_DIR, "phase3_lca_study.json"), "utf-8")
);

const SYSTEM_PROMPT = `You are an extractor for Environmental Product Declarations (EPDs) following EN 15804.

Your task: read the attached EPD PDF excerpt and extract LCA study metadata (typically section 3 — LCA study).

Rules:
- Copy text verbatim where possible. Do not paraphrase normative references or technical statements.
- Map content to the most specific field. Use additional_paragraphs only for substantive text that does not fit another field.
- standards_and_methodology: EN 15804, ISO 14040/14044, calculation rules, and related normative basis.
- pcr_reference: PCR title/edition as stated in this section (not the cover alone unless repeated here).
- lca_software_and_database: software name, database (e.g. GaBi, ecoinvent), versions.
- goal_and_scope, functional_unit, production_sites, cut_off_criteria, allocation, data_quality, time/geographical/technology representativeness, impact_assessment, interpretation: full subsection text for each when present.
- system_boundaries: narrative text only; skip the checkbox diagram if present (declared modules are parsed separately).
- section_title: main heading of the LCA study block when shown.
- subsections: when the EPD lists numbered subsections under LCA study (e.g. 3.1 Date, 3.2 Software, 3.3 Allocation), one entry per subsection with number, title, and full content text. Also map each to the matching top-level field when obvious (e.g. 3.2 → lca_software_and_database).
- If a field is not in the excerpt, set it to null. Do not guess.
- additional_paragraphs: empty array when nothing extra; otherwise one string per distinct leftover paragraph.`;

function emptyLcaStudyShell(
  pdfPath: string,
  pageSpec: string
): Omit<Phase3LcaStudyData, "_source"> {
  return {
    section_title: null,
    standards_and_methodology: null,
    pcr_reference: null,
    lca_software_and_database: null,
    goal_and_scope: null,
    functional_unit: null,
    system_boundaries: null,
    production_sites: null,
    cut_off_criteria: null,
    allocation: null,
    data_quality: null,
    time_representativeness: null,
    geographical_representativeness: null,
    technology_representativeness: null,
    impact_assessment: null,
    interpretation: null,
    additional_paragraphs: null,
    subsections: null,
  };
}

async function parseSystemBoundariesField(
  pdfPath: string,
  stem: string
): Promise<string | null> {
  const pageSpec = resolveSystemBoundariesPageSpec(stem);
  if (!pageSpec.trim()) return null;
  const parsed = await parseSystemBoundariesFromPdf(pdfPath, pageSpec);
  return parsed?.summaryText ?? null;
}

function writePhase3LcaStudy(stem: string, result: Phase3LcaStudyData): void {
  fs.mkdirSync(PHASE_DIRS.phase3_lca_study, { recursive: true });
  fs.writeFileSync(
    path.join(PHASE_DIRS.phase3_lca_study, `${stem}.json`),
    JSON.stringify(result, null, 2)
  );
}

export async function runPhase3LcaStudy(
  pdfPath: string,
  apiKey: string | undefined,
  options: { force?: boolean } = {}
): Promise<Phase3LcaStudyData> {
  const stem = path.basename(pdfPath, path.extname(pdfPath));
  assertPdfWithinBudget(pdfPath);
  const fullSha256 = pdfSha256(pdfPath);
  const pageSpec = resolvePhase3LcaStudyPageSpec(stem);
  const boundariesPageSpec = resolveSystemBoundariesPageSpec(stem);

  const previous = options.force ? null : loadPhase3LcaStudy(stem);
  const parsedBoundaries = await parseSystemBoundariesField(pdfPath, stem);

  const key = apiKey?.trim();
  if (!key) {
    if (!parsedBoundaries && !previous) {
      throw new Error(
        "ANTHROPIC_API_KEY is required for LCA study text (section 3). System-boundaries diagram parsing found no ☒/☐ row on the PDF page."
      );
    }
    const result: Phase3LcaStudyData = {
      ...(previous ?? emptyLcaStudyShell(pdfPath, pageSpec)),
      system_boundaries: parsedBoundaries ?? previous?.system_boundaries ?? null,
      _source: {
        pdf_filename: path.basename(pdfPath),
        pdf_sha256: fullSha256,
        api_pages: boundariesPageSpec || pageSpec,
        api_pages_resolved: boundariesPageSpec || pageSpec,
        extracted_by: parsedBoundaries
          ? "pdf-system-boundaries-parser"
          : (previous?._source?.extracted_by ?? "pdf-system-boundaries-parser"),
        extracted_at: new Date().toISOString(),
        model: null,
        input_tokens: 0,
        output_tokens: 0,
        system_boundaries_parser: true,
      },
    };
    writePhase3LcaStudy(stem, result);
    return result;
  }

  const slice = await slicePdfByPageSpec(pdfPath, pageSpec, { stem, export: true });
  assertApiPayloadWithinBudget(
    slice.byteSize,
    `Phase 3 LCA study slice (pages ${slice.pageRange})`
  );

  const client = new Anthropic({ apiKey: key });
  const response = await createMessageWithRetry(client, {
    model: MODEL,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    tools: [
      {
        name: "record_epd_lca_study",
        description: "Record extracted LCA study metadata. Call exactly once.",
        input_schema: schema as Anthropic.Tool.InputSchema,
      },
    ],
    tool_choice: { type: "tool", name: "record_epd_lca_study" },
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
            text: `Extract LCA study metadata from this EPD excerpt (pages ${slice.pages.join(", ")} of ${slice.totalPages}). Call record_epd_lca_study.`,
          },
        ],
      },
    ],
  }, { label: "phase3-lca-study" });

  const toolUse = response.content.find(
    (block) => block.type === "tool_use" && block.name === "record_epd_lca_study"
  );

  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error(`No tool_use block in response. Stop reason: ${response.stop_reason}`);
  }

  const raw = toolUse.input as Omit<Phase3LcaStudyData, "_source">;
  const result: Phase3LcaStudyData = {
    ...raw,
    system_boundaries:
      parsedBoundaries ?? raw.system_boundaries ?? previous?.system_boundaries ?? null,
    additional_paragraphs: raw.additional_paragraphs
      ? ensureJsonArray(raw.additional_paragraphs)
      : null,
    subsections: Array.isArray(raw.subsections)
      ? raw.subsections.filter(
          (s) =>
            s &&
            typeof s === "object" &&
            (typeof (s as { content?: string }).content === "string"
              ? (s as { content: string }).content.trim().length > 0
              : false)
        )
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
      extracted_by: parsedBoundaries ? "claude-api+pdf-system-boundaries-parser" : "claude-api",
      extracted_at: new Date().toISOString(),
      model: MODEL,
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      ...(parsedBoundaries ? { system_boundaries_pages: boundariesPageSpec } : {}),
    },
  };

  writePhase3LcaStudy(stem, result);
  return result;
}
