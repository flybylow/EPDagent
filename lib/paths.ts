import * as fs from "node:fs";
import * as path from "node:path";

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
} as const;

export function pdfStem(filename: string): string {
  return path.basename(filename, path.extname(filename));
}

export function listPdfFiles(): string[] {
  const dir = pdfDir();
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith(".pdf"))
    .sort();
}
