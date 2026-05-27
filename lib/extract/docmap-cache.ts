import * as fs from "node:fs";
import * as path from "node:path";
import { OUT_DIR } from "../paths";

export function docmapOutputPath(stem: string): string {
  return path.join(OUT_DIR, "phase_docmap", `${stem}.json`);
}

/** Entry count on disk; 0 when missing, empty, or corrupt. */
export function docmapEntryCount(stem: string): number {
  const filePath = docmapOutputPath(stem);
  if (!fs.existsSync(filePath)) return 0;
  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8")) as {
      flat_entries?: unknown[];
    };
    return Array.isArray(data.flat_entries) ? data.flat_entries.length : 0;
  } catch {
    return 0;
  }
}

/** Docmap JSON file exists on disk (may be an empty TOC — prefer {@link docmapIsCached}). */
export function docmapOutputExists(stem: string): boolean {
  return fs.existsSync(docmapOutputPath(stem));
}

/** Docmap is usable when the TOC has at least one section (PDF index, DM light). */
export function docmapIsCached(stem: string): boolean {
  return docmapEntryCount(stem) > 0;
}
