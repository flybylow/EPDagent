import { createHash } from "node:crypto";
import * as fs from "node:fs";
import { collapseTitle } from "../navigation/title-match";
import { isValidSectionNumber } from "../navigation/section-numbers";
import { extractPageLines } from "../pdf/text-lines";
import { pdfPageCount } from "../pdf/text-lines";
import {
  buildTocTree,
  countTreeNodes,
  type FlatTocEntry,
} from "./docmap-parse";
import type { PhaseDocmapResult } from "./docmap";

const FOOTER_NOISE =
  /^\d+\s*\|\s*\d+\s+B\s*-?\s*EPD|^\d+\s*\|\s*\d+$|^\[\s*Product\s*Name\s*\]/i;

const SKIP_LINE =
  /^(B\s*-?\s*EPD|OWNER OF|EPD PROGRAM|EURO\s*\d|TON LORRY|METRIC TON|A[1-5]\s*[–-]|B[1-7]\s*[–-]|C[1-4]\s*[–-]|D[1-4]?\s*[–-]|STAGE\s+\d|PRODUCT NAME IMAGE)/i;

/** Map ALL-CAPS heading text → section number (EN 15804 / B-EPD layouts without TOC). */
const TITLE_TO_NUMBER: Array<{ pattern: RegExp; number: string; level: number }> = [
  { pattern: /^product description$/i, number: "1", level: 1 },
  { pattern: /^product name$/i, number: "1.1", level: 2 },
  { pattern: /^intended use$/i, number: "1.3", level: 2 },
  { pattern: /^reference flow/i, number: "1.4", level: 2 },
  { pattern: /^installation$/i, number: "1.4", level: 2 },
  { pattern: /^composition and content$/i, number: "1.5", level: 2 },
  { pattern: /^reference service life$/i, number: "1.6", level: 2 },
  { pattern: /^description of geographical/i, number: "1.7", level: 2 },
  { pattern: /^description of the production process/i, number: "1.8", level: 2 },
  { pattern: /^technical data/i, number: "2", level: 1 },
  { pattern: /^lca study$/i, number: "3", level: 1 },
  { pattern: /^date of lca study$/i, number: "3.1", level: 2 },
  { pattern: /^software$/i, number: "3.2", level: 2 },
  { pattern: /^information on allocation$/i, number: "3.3", level: 2 },
  { pattern: /^information on cut off$/i, number: "3.4", level: 2 },
  { pattern: /^information on excl/i, number: "3.5", level: 2 },
  { pattern: /^information on biogenic/i, number: "3.6", level: 2 },
  { pattern: /^information on carbon offset/i, number: "3.7", level: 2 },
  { pattern: /^additional or deviating character/i, number: "3.8", level: 2 },
  { pattern: /^description of the variability|^specificity$/i, number: "3.9", level: 2 },
  { pattern: /^period of data collection$/i, number: "3.11", level: 2 },
  { pattern: /^information on data collection$/i, number: "3.12", level: 2 },
  { pattern: /^database used/i, number: "3.13", level: 2 },
  { pattern: /^energy mix$/i, number: "3.14", level: 2 },
  { pattern: /^producti\s*on\s*sites?$/i, number: "4", level: 1 },
  { pattern: /^producti\s*on\s*site$/i, number: "4", level: 1 },
  { pattern: /^system boundar/i, number: "5", level: 1 },
  { pattern: /^potential environmental impact/i, number: "6", level: 1 },
  { pattern: /^resource use$/i, number: "7", level: 1 },
  { pattern: /^waste categor/i, number: "8", level: 1 },
  { pattern: /^impact categor.*additional/i, number: "9", level: 1 },
  { pattern: /^details of the underlying scenar/i, number: "10", level: 1 },
  { pattern: /^additional environmental information|^indoor air$/i, number: "11", level: 1 },
  { pattern: /^soil and water$/i, number: "11.2", level: 2 },
  { pattern: /^demonstration of verification$/i, number: "12", level: 1 },
  { pattern: /^additional technical information for scenario/i, number: "13", level: 1 },
  { pattern: /^application unit$/i, number: "14", level: 1 },
  { pattern: /^additional information on reversibility/i, number: "15", level: 1 },
  { pattern: /^bibliograph/i, number: "16", level: 1 },
  { pattern: /^lca interpretation/i, number: "13", level: 1 },
];

function sha256File(filePath: string): string {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function isAllCapsHeading(text: string): boolean {
  const t = text.trim();
  if (t.length < 6 || t.length > 90) return false;
  const letters = t.replace(/[^A-Za-z]/g, "");
  if (letters.length < 4) return false;
  return t === t.toUpperCase();
}

function matchTitleRule(title: string): { number: string; level: number } | null {
  const normalized = collapseTitle(title).replace(/\s+/g, " ").trim();
  for (const rule of TITLE_TO_NUMBER) {
    if (rule.pattern.test(normalized)) return { number: rule.number, level: rule.level };
  }
  return null;
}

function isPlausibleSectionNumber(number: string): boolean {
  if (!isValidSectionNumber(number)) return false;
  const parts = number.split(".").map((p) => Number(p));
  if (parts.some((p) => !Number.isFinite(p) || p < 1 || p > 20)) return false;
  if (parts.length > 3) return false;
  return true;
}

function parseNumberedHeading(text: string): FlatTocEntry | null {
  const line = collapseTitle(text).replace(/\s+/g, " ").trim();
  const m = line.match(/^(\d+(?:\.\d+)*)\s+(.+)$/);
  if (!m || !isPlausibleSectionNumber(m[1])) return null;
  const title = m[2].trim();
  if (title.length < 2) return null;
  if (/^\d+%?$/.test(title) || /vilvoorde|brussels|belgium|diesel\/km/i.test(title)) {
    return null;
  }
  return {
    number: m[1],
    title,
    page: null,
    level: m[1].split(".").length,
  };
}

export async function scanDocmapHeadingsFromPdf(
  pdfPath: string,
  options: { startPage?: number } = {}
): Promise<FlatTocEntry[]> {
  const total = await pdfPageCount(pdfPath);
  const start = options.startPage ?? 2;
  const byNumber = new Map<string, FlatTocEntry>();

  for (let page = start; page <= total; page++) {
    const lines = await extractPageLines(pdfPath, page);
    for (const line of lines) {
      const text = collapseTitle(line.text).replace(/\s+/g, " ").trim();
      if (!text || FOOTER_NOISE.test(text) || SKIP_LINE.test(text)) continue;

      const numbered = parseNumberedHeading(text);
      if (numbered) {
        const prev = byNumber.get(numbered.number);
        if (!prev) byNumber.set(numbered.number, { ...numbered, page });
        continue;
      }

      if (!isAllCapsHeading(text)) continue;
      const rule = matchTitleRule(text);
      if (!rule) continue;
      if (!byNumber.has(rule.number)) {
        byNumber.set(rule.number, {
          number: rule.number,
          title: text,
          page,
          level: rule.level,
        });
      }
    }
  }

  return [...byNumber.values()].sort((a, b) => {
    const pa = a.page ?? 9999;
    const pb = b.page ?? 9999;
    if (pa !== pb) return pa - pb;
    return a.number.localeCompare(b.number, undefined, { numeric: true });
  });
}

export async function extractDocmapFromHeadings(
  pdfPath: string
): Promise<PhaseDocmapResult> {
  const flat = await scanDocmapHeadingsFromPdf(pdfPath);
  const entries = buildTocTree(flat);
  return {
    toc_title: "Document sections (heading scan)",
    source_pages: [],
    entries,
    flat_entries: flat,
    _source: {
      pdf_path: pdfPath,
      pdf_sha256: sha256File(pdfPath),
      page_spec_source: "default",
      extracted_by: "pdf-heading-scan",
      extracted_at: new Date().toISOString(),
      entry_count: flat.length,
      tree_node_count: countTreeNodes(entries),
    },
  };
}
