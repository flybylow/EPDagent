import type { PdfTextLine } from "../pdf/text-lines";

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
  return text.replace(/\s+/g, " ").trim();
}

/** Parse a TOC line like "1.2 Product name .......... 4" */
export function parseTocLine(text: string): FlatTocEntry | null {
  let line = normalizeLine(text);
  if (!line || FOOTER_NOISE.test(line) || TOC_HEADING.test(line)) return null;

  line = line.replace(/\.{2,}/g, " ").replace(/\s+/g, " ").trim();

  const m = line.match(/^(\d+(?:\.\d+)*)\s+(.+?)\s+(\d+)$/);
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

    const parsed = parseTocLine(text);
    if (parsed) {
      if (pending) entries.push(pending);
      pending = parsed;
      continue;
    }

    if (pending && text && !FOOTER_NOISE.test(text) && !/^\d+(?:\.\d+)*\s/.test(text)) {
      pending.title = `${pending.title} ${text}`.replace(/\s+/g, " ").trim();
    }
  }

  if (pending) entries.push(pending);
  return { tocTitle, entries };
}

export function buildTocTree(flat: FlatTocEntry[]): TocNode[] {
  const root: TocNode[] = [];
  const stack: TocNode[] = [];

  for (const entry of flat) {
    const node: TocNode = { ...entry, children: [] };
    while (stack.length > 0 && stack[stack.length - 1]!.level >= node.level) {
      stack.pop();
    }
    if (stack.length === 0) {
      root.push(node);
    } else {
      stack[stack.length - 1]!.children!.push(node);
    }
    stack.push(node);
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
