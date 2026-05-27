import { extractPdfPageTextItems, type PdfTextItem } from "../pdf/text-items";
import { parsePageSpecs } from "../pdf/pages";

const MODULE_RE = /^(A[1-5]|B[1-7]|C[1-4]|D)$/;

const STAGE_BY_MODULE: Record<string, string> = {
  A1: "Product stage",
  A2: "Product stage",
  A3: "Product stage",
  A4: "Construction installation stage",
  A5: "Construction installation stage",
  B1: "Use stage",
  B2: "Use stage",
  B3: "Use stage",
  B4: "Use stage",
  B5: "Use stage",
  B6: "Use stage",
  B7: "Use stage",
  C1: "End of life stage",
  C2: "End of life stage",
  C3: "End of life stage",
  C4: "End of life stage",
  D: "Beyond the system boundaries",
};

function isModuleCode(str: string): boolean {
  return MODULE_RE.test(str);
}

function isDeclaredMark(str: string): boolean {
  return /☒|✓|✔/.test(str) || /^[Xx]$/.test(str);
}

function isNotDeclaredMark(str: string): boolean {
  return /☐/.test(str);
}

function clusterY(items: PdfTextItem[], tolerance = 10): number | null {
  if (!items.length) return null;
  const counts = new Map<number, number>();
  for (const item of items) {
    const bucket = Math.round(item.y / tolerance) * tolerance;
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  }
  let best = items[0].y;
  let max = 0;
  for (const [y, n] of counts) {
    if (n > max) {
      max = n;
      best = y;
    }
  }
  return best;
}

function itemsNearY(items: PdfTextItem[], y: number, tolerance = 12): PdfTextItem[] {
  return items.filter((i) => Math.abs(i.y - y) <= tolerance);
}

function nearestByX(targetX: number, candidates: PdfTextItem[]): PdfTextItem | null {
  if (!candidates.length) return null;
  return candidates.reduce((best, cur) =>
    Math.abs(cur.x - targetX) < Math.abs(best.x - targetX) ? cur : best
  );
}

export interface SystemBoundariesParseResult {
  page: number;
  declaredModules: string[];
  notDeclaredModules: string[];
  moduleLabels: Array<{ module: string; label: string | null }>;
  summaryText: string;
}

export function parseSystemBoundariesFromTextItems(
  items: PdfTextItem[],
  page: number
): SystemBoundariesParseResult | null {
  const horizontal = items.filter((i) => Math.abs(i.rotation) < 15);
  const moduleItems = horizontal.filter((i) => isModuleCode(i.str));
  if (moduleItems.length < 4) return null;

  const moduleY = clusterY(moduleItems);
  if (moduleY == null) return null;

  const modules = itemsNearY(moduleItems, moduleY)
    .filter((i) => isModuleCode(i.str))
    .sort((a, b) => a.x - b.x);

  const marks = horizontal.filter((i) => isDeclaredMark(i.str) || isNotDeclaredMark(i.str));
  const markY = clusterY(marks);
  const markRow = markY != null ? itemsNearY(marks, markY) : [];

  const declared: string[] = [];
  const notDeclared: string[] = [];

  for (const mod of modules) {
    const mark = nearestByX(mod.x, markRow);
    if (!mark) continue;
    if (isDeclaredMark(mark.str)) declared.push(mod.str);
    else if (isNotDeclaredMark(mark.str)) notDeclared.push(mod.str);
  }

  if (!declared.length && !notDeclared.length) return null;

  const vertical = items.filter((i) => Math.abs(Math.abs(i.rotation) - 90) < 15);
  const moduleLabels: Array<{ module: string; label: string | null }> = [];
  for (const mod of modules) {
    const labelItem = nearestByX(
      mod.x,
      vertical.filter((i) => i.str.length > 2 && !isModuleCode(i.str))
    );
    moduleLabels.push({
      module: mod.str,
      label: labelItem?.str ?? null,
    });
  }

  const byStage = new Map<string, string[]>();
  for (const code of declared) {
    const stage = STAGE_BY_MODULE[code] ?? "Other";
    const list = byStage.get(stage) ?? [];
    list.push(code);
    byStage.set(stage, list);
  }

  const stageLines = [...byStage.entries()]
    .map(([stage, mods]) => `${stage}: ${mods.join(", ")}`)
    .join("\n");

  const labelLines = moduleLabels
    .filter((r) => r.label)
    .map((r) => `${r.module}: ${r.label}`)
    .join("\n");

  const summaryText = [
    "System boundaries (parsed from PDF diagram — no AI)",
    `Page ${page}`,
    "",
    `Declared modules (☒): ${declared.length ? declared.join(", ") : "—"}`,
    `Not declared (☐): ${notDeclared.length ? notDeclared.join(", ") : "—"}`,
    "",
    "By life-cycle stage:",
    stageLines,
    labelLines ? `\nModule labels (vertical text):\n${labelLines}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    page,
    declaredModules: declared,
    notDeclaredModules: notDeclared,
    moduleLabels,
    summaryText,
  };
}

export async function parseSystemBoundariesFromPdfPage(
  pdfPath: string,
  pageNum: number
): Promise<SystemBoundariesParseResult | null> {
  const items = await extractPdfPageTextItems(pdfPath, pageNum);
  return parseSystemBoundariesFromTextItems(items, pageNum);
}

export async function parseSystemBoundariesFromPdf(
  pdfPath: string,
  pageSpec: string
): Promise<SystemBoundariesParseResult | null> {
  const pages = parsePageSpecs(pageSpec);
  for (const page of pages) {
    const parsed = await parseSystemBoundariesFromPdfPage(pdfPath, page);
    if (parsed) return parsed;
  }
  return null;
}
