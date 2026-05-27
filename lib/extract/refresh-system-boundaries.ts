import * as fs from "node:fs";
import * as path from "node:path";
import { loadPhase3LcaStudy, pdfPathForStem } from "../data";
import { pdfSha256 } from "../anthropic/guard";
import { PHASE_DIRS, pdfDir } from "../paths";
import type { Phase3LcaStudyData } from "../types";
import {
  resolvePhase3LcaStudyPageSpec,
  resolveSystemBoundariesPageSpec,
} from "./phase3-lca-study-pages";
import { parseSystemBoundariesFromPdf } from "./system-boundaries-parse";

async function parseBoundariesSummary(
  pdfPath: string,
  stem: string
): Promise<string | null> {
  const pageSpec = resolveSystemBoundariesPageSpec(stem);
  if (!pageSpec.trim()) return null;
  const parsed = await parseSystemBoundariesFromPdf(pdfPath, pageSpec);
  return parsed?.summaryText ?? null;
}

/** Update phase3_lca_study JSON with pdf.js system-boundaries diagram (no API). */
export async function refreshSystemBoundariesForStem(
  stem: string
): Promise<{ ok: boolean; reason: string }> {
  const pdfPath = pdfPathForStem(stem);
  if (!pdfPath) {
    return { ok: false, reason: "PDF not found" };
  }

  const summary = await parseBoundariesSummary(pdfPath, stem);
  if (!summary) {
    return { ok: false, reason: "no ☒/☐ diagram on docmap §5 page" };
  }

  const previous = loadPhase3LcaStudy(stem);
  const pageSpec = resolveSystemBoundariesPageSpec(stem);
  const result: Phase3LcaStudyData = {
    ...(previous ?? {
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
    }),
    system_boundaries: summary,
    _source: {
      ...(previous?._source ?? {
        pdf_filename: path.basename(pdfPath),
        pdf_sha256: pdfSha256(pdfPath),
        api_pages: resolvePhase3LcaStudyPageSpec(stem),
        api_pages_resolved: pageSpec,
        extracted_by: "pdf-system-boundaries-parser",
        extracted_at: new Date().toISOString(),
        model: null,
        input_tokens: 0,
        output_tokens: 0,
      }),
      extracted_by: previous?._source?.extracted_by
        ? `${previous._source.extracted_by}+pdf-system-boundaries-parser`
        : "pdf-system-boundaries-parser",
      system_boundaries_pages: pageSpec,
      system_boundaries_refreshed_at: new Date().toISOString(),
    },
  };

  fs.mkdirSync(PHASE_DIRS.phase3_lca_study, { recursive: true });
  fs.writeFileSync(
    path.join(PHASE_DIRS.phase3_lca_study, `${stem}.json`),
    JSON.stringify(result, null, 2)
  );
  return { ok: true, reason: pageSpec };
}

export async function refreshSystemBoundariesAll(): Promise<{
  ok: number;
  fail: number;
  rows: Array<{ stem: string; status: string }>;
}> {
  const pdfs = fs
    .readdirSync(pdfDir())
    .filter((f) => f.toLowerCase().endsWith(".pdf"));
  const rows: Array<{ stem: string; status: string }> = [];
  let ok = 0;
  let fail = 0;

  for (const file of pdfs.sort()) {
    const stem = path.basename(file, path.extname(file));
    const r = await refreshSystemBoundariesForStem(stem);
    if (r.ok) {
      ok++;
      rows.push({ stem, status: `ok (${r.reason})` });
    } else {
      fail++;
      rows.push({ stem, status: r.reason });
    }
  }
  return { ok, fail, rows };
}
