import * as fs from "node:fs";
import * as path from "node:path";
import { parsePageSpecs } from "../pdf/pages";
import { getReferenceByStem, referenceCompareDir } from "../reference";
import { extractPageLines, pdfPageCount } from "../pdf/text-lines";

const TOC_HEADING = /^TABLE OF CONTENTS$/i;

/** Per-EPD page list for docmap (reference manifest) or heuristic scan. */
export async function resolveDocmapPageSpec(
  pdfPath: string,
  stem: string
): Promise<{ pages: number[]; source: "manifest" | "scan" | "default" }> {
  const ref = getReferenceByStem(stem);
  if (ref) {
    const manifestPath = path.join(referenceCompareDir(ref.id), "manifest.json");
    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as {
        docmapPages?: string;
      };
      if (manifest.docmapPages?.trim()) {
        return {
          pages: parsePageSpecs(manifest.docmapPages.trim()),
          source: "manifest",
        };
      }
    }
  }

  const scanned = await scanForTocPages(pdfPath);
  if (scanned.length > 0) {
    return { pages: scanned, source: "scan" };
  }

  return { pages: [2, 3], source: "default" };
}

async function scanForTocPages(pdfPath: string, maxScan = 20): Promise<number[]> {
  const total = await pdfPageCount(pdfPath);
  const hits: number[] = [];

  for (let page = 1; page <= Math.min(total, maxScan); page++) {
    const lines = await extractPageLines(pdfPath, page);
    if (lines.some((l) => TOC_HEADING.test(l.text.trim()))) {
      hits.push(page);
    }
  }

  if (hits.length === 0) return [];

  const contiguous: number[] = [...hits];
  const last = hits[hits.length - 1]!;
  if (last + 1 <= total) {
    const nextLines = await extractPageLines(pdfPath, last + 1);
    const hasSection = nextLines.some((l) => /^\d+(?:\.\d+)*\s/.test(l.text));
    if (hasSection) contiguous.push(last + 1);
  }

  return [...new Set(contiguous)].sort((a, b) => a - b);
}
