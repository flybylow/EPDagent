import { collapseTitle, navSectionTitle, titleKey } from "../navigation/title-match";
import { isValidSectionNumber } from "../navigation/section-numbers";
import { extractPageLines, type PdfTextLine } from "../pdf/text-lines";
import { parsePageSpecs } from "../pdf/pages";
import { loadDocmapForStem } from "../phases/registry";
import type { EpdSectionBlock } from "../types";
import type { Phase7TargetSection } from "./phase7-targets";
import { resolvePhase7PageSpec } from "./phase7-pages";

interface SectionAnchor {
  number: string;
  title: string;
  page: number;
  y: number;
}

function parseSectionHeading(line: string): { number: string; title: string } | null {
  const t = collapseTitle(line).replace(/\s+/g, " ").trim();
  const m = t.match(/^(\d+(?:\.\d+)*)\s*\.?\s+(.+)$/);
  if (!m || !isValidSectionNumber(m[1])) return null;
  const title = m[2].trim();
  if (title.length < 3) return null;
  if (/^STAG[Ee]\s+\d/i.test(title)) return null;
  return { number: m[1], title };
}

function targetMatchesAnchor(target: Phase7TargetSection, anchor: SectionAnchor): boolean {
  if (target.number === anchor.number) return true;
  const tk = titleKey(target.title);
  const ak = titleKey(anchor.title);
  if (!tk || !ak) return false;
  if (tk === ak) return true;
  const minLen = Math.min(tk.length, ak.length, 14);
  return tk.includes(ak.slice(0, minLen)) || ak.includes(tk.slice(0, minLen));
}

function titleLineMatchesTarget(line: string, target: Phase7TargetSection): boolean {
  const collapsed = collapseTitle(line).replace(/\s+/g, " ").trim();
  if (collapsed.length < 12) return false;
  const targetLow = target.title.toLowerCase();
  const lineLow = collapsed.toLowerCase();
  if (/scenario development/i.test(targetLow)) {
    return /additional technical information.*scenario development/i.test(lineLow);
  }
  if (/application unit/i.test(targetLow)) {
    return /^application unit\b/i.test(lineLow);
  }
  if (/reversibilit/i.test(targetLow)) {
    return /additional information on reversibility/i.test(lineLow);
  }
  const tk = titleKey(target.title);
  const lk = titleKey(collapsed);
  if (!tk || !lk) return false;
  if (lk === tk) return true;
  const minLen = Math.min(tk.length, lk.length, 22);
  return tk.includes(lk.slice(0, minLen)) || lk.includes(tk.slice(0, minLen));
}

function findAnchorIndex(
  anchors: SectionAnchor[],
  target: Phase7TargetSection,
  flat: Array<{ number: string; title: string; page: number | null }>
): number {
  const entry =
    flat.find((e) => e.number === target.number) ??
    flat.find((e) => titleKey(e.title) === titleKey(target.title));
  if (entry?.page != null) {
    const onPage = anchors
      .map((a, i) => ({ a, i }))
      .filter(({ a }) => a.page === entry.page && targetMatchesAnchor(target, a));
    if (onPage.length === 1) return onPage[0]!.i;
    const exact = onPage.find(({ a }) => titleKey(a.title) === titleKey(target.title));
    if (exact) return exact.i;
    if (onPage.length) return onPage[0]!.i;
  }
  return anchors.findIndex((a) => targetMatchesAnchor(target, a));
}

function sortAnchors(anchors: SectionAnchor[]): SectionAnchor[] {
  return [...anchors].sort((a, b) => a.page - b.page || b.y - a.y);
}

function buildDocmapTitleAnchors(
  allLines: Array<PdfTextLine & { page: number }>,
  flat: Array<{ number: string; title: string; page: number | null }>,
  targets: Phase7TargetSection[],
  existing: SectionAnchor[]
): SectionAnchor[] {
  const hasNumber = new Set(existing.map((a) => a.number));
  const out: SectionAnchor[] = [];
  for (const target of targets) {
    if (hasNumber.has(target.number)) continue;
    const entry =
      flat.find((e) => e.number === target.number) ??
      flat.find((e) => titleKey(e.title) === titleKey(target.title));
    if (entry?.page == null) continue;
    const idx = allLines.findIndex(
      (l) => l.page === entry.page && titleLineMatchesTarget(l.text, target)
    );
    if (idx < 0) continue;
    const line = allLines[idx]!;
    out.push({
      number: target.number,
      title: navSectionTitle(entry.title, entry.number),
      page: line.page,
      y: line.y,
    });
    hasNumber.add(target.number);
  }
  return out;
}

function nextAnchorAfter(
  anchors: SectionAnchor[],
  index: number
): SectionAnchor | null {
  return anchors[index + 1] ?? null;
}

function collectPreamble(
  lines: Array<PdfTextLine & { page: number }>,
  startIdx: number,
  stopYs: number[] = []
): string {
  const anchor = lines[startIdx]!;
  const parts: string[] = [];
  for (let i = startIdx - 1; i >= 0; i--) {
    const line = lines[i]!;
    if (line.page !== anchor.page) break;
    if (stopYs.some((y) => Math.abs(line.y - y) <= 4)) break;
    if (line.page === anchor.page && parseSectionHeading(line.text)) break;
    const text = line.text.replace(/\s+/g, " ").trim();
    if (!text || /^B-EPD\b/i.test(text)) continue;
    if (/^\d+\s*\|\s*\d+/.test(text)) continue;
    parts.unshift(text);
  }
  return parts.join("\n\n").trim();
}

function blockNumberForTarget(target: Phase7TargetSection): string {
  const t = target.title.toLowerCase();
  if (target.number === "11" && /indoor\s*air/.test(t)) return "11.1";
  if (target.number === "11" && /soil|water/.test(t)) return "11.2";
  return target.number;
}

/** Drop parent §11 banner lines that bleed into §11.1 body text. */
function cleanPhase7Content(content: string, target: Phase7TargetSection): string {
  const num = blockNumberForTarget(target);
  if (num !== "11.1") return content;

  const parts = content.split("\n\n");
  const start = parts.findIndex((p) =>
    /TVOC|VOC\s*emission|measured by|EN\s*16516|CEN\/TS|µg\/m|ug\/m/i.test(p)
  );
  if (start > 0) return parts.slice(start).join("\n\n").trim();

  return content
    .replace(
      /^(?:\d+\s+)?(?:RELEASE OF DANGEROUS\s+)?SUBSTANCES TO INDOOR AIR[\s\S]*?(?=\n\n(?:TVOC|VOC|The product|This product))/i,
      ""
    )
    .trim();
}

function collectSectionBody(
  lines: Array<PdfTextLine & { page: number }>,
  startIdx: number,
  endPage: number,
  endY: number,
  preambleStopYs: number[] = []
): string {
  const parts: string[] = [];
  const anchorLine = lines[startIdx]!;
  const preamble =
    parseSectionHeading(anchorLine.text) != null
      ? collectPreamble(lines, startIdx, preambleStopYs)
      : "";
  if (preamble) parts.push(preamble);
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i]!;
    if (line.page > endPage) break;
    if (line.page === endPage && line.y <= endY) break;
    const text = line.text.replace(/\s+/g, " ").trim();
    if (!text || /^B-EPD\b/i.test(text)) continue;
    if (/^\d+\s*\|\s*\d+/.test(text)) continue;
    parts.push(text);
  }
  return parts.join("\n\n").trim();
}

export async function extractPhase7BlocksFromPdfText(
  pdfPath: string,
  stem: string,
  targets: Phase7TargetSection[]
): Promise<EpdSectionBlock[]> {
  const pageSpec = resolvePhase7PageSpec(stem);
  const pages = parsePageSpecs(pageSpec);
  if (!pages.length) return [];

  const allLines: Array<PdfTextLine & { page: number }> = [];
  for (const page of pages) {
    const lines = await extractPageLines(pdfPath, page);
    for (const line of lines) {
      allLines.push({ ...line, page });
    }
  }
  allLines.sort((a, b) => a.page - b.page || b.y - a.y);

  const numberedAnchors: SectionAnchor[] = [];
  for (let i = 0; i < allLines.length; i++) {
    const parsed = parseSectionHeading(allLines[i]!.text);
    if (!parsed) continue;
    numberedAnchors.push({
      number: parsed.number,
      title: parsed.title,
      page: allLines[i]!.page,
      y: allLines[i]!.y,
    });
  }

  const docmap = loadDocmapForStem(stem);
  const flat = docmap?.flat_entries ?? [];
  const titleAnchors = buildDocmapTitleAnchors(
    allLines,
    flat,
    targets,
    numberedAnchors
  );
  const anchors = sortAnchors([...numberedAnchors, ...titleAnchors]);

  const blocks: EpdSectionBlock[] = [];
  for (const target of targets) {
    const anchorIdx = findAnchorIndex(anchors, target, flat);
    if (anchorIdx < 0) continue;

    const anchor = anchors[anchorIdx]!;
    const next = nextAnchorAfter(anchors, anchorIdx);
    const endPage = next?.page ?? anchor.page;
    const endY = next?.y ?? 0;

    const startLineIdx = allLines.findIndex(
      (l) => l.page === anchor.page && l.y === anchor.y
    );
    if (startLineIdx < 0) continue;

    const stopYs = anchors
      .filter((a) => a.page === anchor.page && a.y > anchor.y)
      .map((a) => a.y);
    const raw = collectSectionBody(allLines, startLineIdx, endPage, endY, stopYs);
    const content = cleanPhase7Content(raw, target);
    if (content.length < 60) continue;

    blocks.push({
      number: blockNumberForTarget(target),
      title: target.title,
      content,
    });
  }

  return blocks;
}
