import type { PdfTextLine } from "../pdf/text-lines";
import { collapseTitle } from "../navigation/title-match";
import { sectionParentNumber } from "../navigation/section-numbers";

export interface FlatTocEntry {
  number: string;
  title: string;
  page: number | null;
  level: number;
}

export interface TocNode extends FlatTocEntry {
  children?: TocNode[];
}

const TOC_HEADING = /^TABLE OF CONTENTS$/i;
const FOOTER_NOISE =
  /^\d+\s*\|\s*\d+\s+B\s*-?\s*EPD|^\d+\s*\|\s*\d+$|^\[\s*Product\s*Name\s*\]/i;

function normalizeLine(text: string): string {
  return collapseTitle(text);
}

/** Parse a TOC line like "1.2 Product name .......... 4" */
export function parseTocLine(text: string): FlatTocEntry | null {
  let line = normalizeLine(text);
  if (!line || FOOTER_NOISE.test(line) || TOC_HEADING.test(line)) return null;

  line = line.replace(/\.{2,}/g, " ").replace(/\s+/g, " ").trim();

  // Subsection numbers are often glued to the title (e.g. "10.1A1-raw material supply … 21").
  const m = line.match(/^(\d+(?:\.\d+)*)\s*(.+?)\s+(\d+)$/);
  if (!m) return null;

  const number = m[1];
  const title = m[2].trim();
  const page = Number(m[3]);

  if (!title || title.length < 2) return null;

  return {
    number,
    title,
    page,
    level: number.split(".").length,
  };
}

export function parseTocFromLines(lines: PdfTextLine[]): {
  tocTitle: string | null;
  entries: FlatTocEntry[];
} {
  let tocTitle: string | null = null;
  const entries: FlatTocEntry[] = [];
  let pending: FlatTocEntry | null = null;

  for (const line of lines) {
    const text = normalizeLine(line.text);
    if (TOC_HEADING.test(text)) {
      tocTitle = "TABLE OF CONTENTS";
      continue;
    }

    if (/^STAG[eE]\s+\d+$/i.test(text)) {
      if (pending) entries.push(pending);
      pending = null;
      continue;
    }

    const parsed = parseTocLine(text);
    if (parsed) {
      if (pending) entries.push(pending);
      pending = parsed;
      continue;
    }

    if (pending && text && !FOOTER_NOISE.test(text)) {
      pending.title = `${pending.title} ${text}`.replace(/\s+/g, " ").trim();
    }
  }

  if (pending) entries.push(pending);
  return { tocTitle, entries: repairFlatTocEntries(entries) };
}

/** Split TOC rows where subsection lines were merged into a parent title. */
export function repairFlatTocEntries(entries: FlatTocEntry[]): FlatTocEntry[] {
  const out: FlatTocEntry[] = [];
  for (const entry of entries) {
    out.push(...splitMergedTocEntry(entry));
  }
  return out;
}

function splitMergedTocEntry(entry: FlatTocEntry): FlatTocEntry[] {
  const embedAt = entry.title.search(/\s\d+(?:\.\d+)+[A-Za-z]/);
  if (embedAt <= 0) return [entry];

  const mainTitle = entry.title.slice(0, embedAt).trim();
  const tail = entry.title.slice(embedAt).trim();
  const result: FlatTocEntry[] = [{ ...entry, title: mainTitle }];

  for (const part of tail.split(/\s(?=\d+(?:\.\d+)+[A-Za-z])/)) {
    const line = part.replace(/\.{2,}/g, " ").replace(/\s+/g, " ").trim();
    const parsed = parseTocLine(line);
    if (parsed) result.push(parsed);
  }

  return result.length > 1 ? result : [entry];
}

/** Build hierarchy from explicit section numbers (11.1 → 11), not dot depth alone. */
export function buildTocTree(flat: FlatTocEntry[]): TocNode[] {
  const byNumber = new Map<string, TocNode>();
  const root: TocNode[] = [];

  for (const entry of flat) {
    const node: TocNode = {
      ...entry,
      level: entry.number.split(".").length,
      children: [],
    };
    byNumber.set(entry.number, node);
    const parentNum = sectionParentNumber(entry.number);
    const parent = parentNum ? byNumber.get(parentNum) : undefined;
    if (parent) {
      parent.children!.push(node);
    } else {
      root.push(node);
    }
  }

  const stripEmpty = (nodes: TocNode[]): TocNode[] =>
    nodes.map((n) => ({
      ...n,
      children: n.children?.length ? stripEmpty(n.children) : undefined,
    }));

  return stripEmpty(root);
}

export function countTreeNodes(nodes: TocNode[]): number {
  return nodes.reduce((n, node) => n + 1 + (node.children ? countTreeNodes(node.children) : 0), 0);
}
