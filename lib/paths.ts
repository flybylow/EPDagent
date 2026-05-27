import * as path from "node:path";
import { pathIsDirectory, safeReaddir } from "./fs-safe";

export const ROOT = process.cwd();
export const DEFAULT_PDF_DIR = path.join(ROOT, "data", "EPD");
export const REFERENCE_DIR = path.join(ROOT, "data", "reference");

/** Override with EPDAGENT_PDF_DIR only when PDFs live outside the project. */
export function pdfDir(): string {
  const configured = process.env.EPDAGENT_PDF_DIR?.trim();
  if (!configured) return DEFAULT_PDF_DIR;
  return path.isAbsolute(configured) ? configured : path.join(ROOT, configured);
}

export const PDF_DIR = pdfDir();
export const OUT_DIR = path.join(ROOT, "out");
export const GRAPH_DIR = path.join(ROOT, "data", "graph");
export const SCHEMAS_DIR = path.join(ROOT, "schemas");
export const FIXTURES_DIR = path.join(ROOT, "fixtures", "demo");
export const DRAFTS_DIR = path.join(OUT_DIR, "drafts");
export const VERIFICATION_DIR = path.join(OUT_DIR, "verification");

export const PHASE_DIRS = {
  phase1: path.join(OUT_DIR, "phase1_filename"),
  phase2: path.join(OUT_DIR, "phase2_header"),
  phase3: path.join(OUT_DIR, "phase3_product"),
  phase3_composition: path.join(OUT_DIR, "phase3_composition"),
  phase3_lca_study: path.join(OUT_DIR, "phase3_lca_study"),
  phase4: path.join(OUT_DIR, "phase4_lca"),
  phase4_probe: path.join(OUT_DIR, "phase4_lca_probe"),
  phase5: path.join(OUT_DIR, "phase5_scenarios"),
  phase6: path.join(OUT_DIR, "phase6_refs"),
  phase7: path.join(OUT_DIR, "phase7_epd_sections"),
  phase_docmap: path.join(OUT_DIR, "phase_docmap"),
} as const;

export function pdfStem(filename: string): string {
  return path.basename(filename, path.extname(filename));
}

export function listPdfFiles(): string[] {
  const dir = pdfDir();
  return safeReaddir(dir)
    .filter((f) => f.toLowerCase().endsWith(".pdf"))
    .sort();
}
