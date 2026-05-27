import { canonicalExtractStem, pdfPathForStem } from "../data";
import { loadDocmapForStem } from "../phases/registry";
import { docmapIsCached } from "./docmap-cache";
import { writeDocmap } from "./docmap";
import type { PhaseDocmapResult } from "./docmap";

/**
 * Build or refresh the PDF section index when missing or empty (TOC failed, no menu).
 * Uses heading-scan fallback inside {@link writeDocmap} — no API key.
 */
export async function ensureDocmapForStem(stem: string): Promise<PhaseDocmapResult | null> {
  const canonical = canonicalExtractStem(stem);
  if (docmapIsCached(canonical)) {
    return loadDocmapForStem(canonical);
  }

  const pdfPath = pdfPathForStem(stem);
  if (!pdfPath) return null;

  await writeDocmap(pdfPath);
  return loadDocmapForStem(canonical);
}
