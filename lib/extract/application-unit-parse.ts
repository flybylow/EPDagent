import { extractPdfPageTextItems, type PdfTextItem } from "../pdf/text-items";
import { parsePageSpecs } from "../pdf/pages";

export interface ApplicationUnitRow {
  commercial_name: string | null;
  description: string | null;
  reference_flow: string | null;
  thickness_mm: string | null;
  scalability_min_mm: string | null;
  scalability_max_mm: string | null;
  specs: string | null;
  application: string | null;
  ratio: string | null;
}

export interface ApplicationUnitParseResult {
  page: number;
  intro: string | null;
  rows: ApplicationUnitRow[];
  summaryText: string;
}

const COL_BOUNDS = [125, 188, 229, 268, 308, 348, 391, 472];

function rowKey(y: number, step = 8): number {
  return Math.round(y / step) * step;
}

function colIndex(x: number): number {
  for (let i = 0; i < COL_BOUNDS.length; i++) {
    if (x < COL_BOUNDS[i]!) return i;
  }
  return COL_BOUNDS.length;
}

function joinParts(parts: PdfTextItem[]): string {
  return parts
    .sort((a, b) => a.x - b.x)
    .map((p) => p.str)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function isCommercialName(str: string): boolean {
  return /^(HOMETEC|FRAMETEC|ACOUSTIC|PARTY WALL|CAVITY BATT)/i.test(str.trim());
}

function commercialAnchors(body: PdfTextItem[]): PdfTextItem[] {
  const byY = new Map<number, PdfTextItem[]>();
  for (const item of body.filter((i) => i.x < 115)) {
    const key = rowKey(item.y, 6);
    const list = byY.get(key) ?? [];
    list.push(item);
    byY.set(key, list);
  }
  const anchors: PdfTextItem[] = [];
  for (const cluster of byY.values()) {
    const label = joinParts(cluster);
    if (isCommercialName(label)) {
      const y = Math.round(cluster.reduce((s, i) => s + i.y, 0) / cluster.length);
      anchors.push({ ...cluster[0]!, y, str: label });
    }
  }
  return anchors.sort((a, b) => b.y - a.y);
}

function itemsForAnchor(
  body: PdfTextItem[],
  anchorY: number,
  floorY: number
): PdfTextItem[] {
  return body.filter((i) => i.y <= anchorY + 4 && i.y > floorY);
}

function formatSummary(intro: string | null, rows: ApplicationUnitRow[], page: number): string {
  const lines = [
    "Application unit (parsed from PDF table — no AI)",
    `Page ${page}`,
    "",
  ];
  if (intro?.trim()) {
    lines.push(intro.trim(), "");
  }
  if (!rows.length) return lines.join("\n");
  const header =
    "| Commercial names | Description | Reference flow | Thickness (mm) | Scalability min (mm) | Scalability max (mm) | Specs | Application | Ratio |";
  const sep = "|---|---|---|---|---|---|---|---|---|";
  lines.push(header, sep);
  for (const r of rows) {
    lines.push(
      `| ${[r.commercial_name, r.description, r.reference_flow, r.thickness_mm, r.scalability_min_mm, r.scalability_max_mm, r.specs, r.application, r.ratio]
        .map((c) => (c ?? "").replace(/\|/g, "\\|") || "—")
        .join(" | ")} |`
    );
  }
  return lines.join("\n");
}

export function parseApplicationUnitFromTextItems(
  items: PdfTextItem[],
  page: number
): ApplicationUnitParseResult | null {
  const headerItem = items.find((i) => /^commercial names$/i.test(i.str));
  if (!headerItem) return null;

  const headerY = headerItem.y;
  const introParts = items.filter(
    (i) =>
      i.y > headerY + 20 &&
      i.y < headerY + 80 &&
      i.x < 120 &&
      !/^commercial names$/i.test(i.str)
  );
  const intro = joinParts(introParts);

  const body = items.filter(
    (i) =>
      i.y < headerY - 6 &&
      i.x < 560 &&
      !/^(flow|\(mm\)|minimum|maximum|description|reference|thickness|scalability|specs|application|ratio)$/i.test(
        i.str
      )
  );

  const anchors = commercialAnchors(body);
  const rows: ApplicationUnitRow[] = [];

  for (let i = 0; i < anchors.length; i++) {
    const anchor = anchors[i]!;
    const floorY = i + 1 < anchors.length ? anchors[i + 1]!.y - 2 : 0;
    const cluster = itemsForAnchor(body, anchor.y, floorY);
    const byCol: PdfTextItem[][] = Array.from({ length: 9 }, () => []);
    for (const item of cluster) {
      byCol[colIndex(item.x)]!.push(item);
    }
    const cells = byCol.map((parts) => joinParts(parts));
    rows.push({
      commercial_name: cells[0] || anchor.str,
      description: cells[1] || null,
      reference_flow: cells[2] || null,
      thickness_mm: cells[3] || null,
      scalability_min_mm: cells[4] || null,
      scalability_max_mm: cells[5] || null,
      specs: cells[6] || null,
      application: cells[7] || null,
      ratio: cells[8] || null,
    });
  }

  if (!rows.length) return null;

  return {
    page,
    intro: intro || null,
    rows,
    summaryText: formatSummary(intro, rows, page),
  };
}

export async function parseApplicationUnitFromPdfPage(
  pdfPath: string,
  pageNum: number
): Promise<ApplicationUnitParseResult | null> {
  const items = await extractPdfPageTextItems(pdfPath, pageNum);
  return parseApplicationUnitFromTextItems(items, pageNum);
}

export async function parseApplicationUnitFromPdf(
  pdfPath: string,
  pageSpec: string
): Promise<ApplicationUnitParseResult | null> {
  for (const page of parsePageSpecs(pageSpec)) {
    const parsed = await parseApplicationUnitFromPdfPage(pdfPath, page);
    if (parsed) return parsed;
  }
  return null;
}
