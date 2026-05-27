import { extractPdfPageTextItems, type PdfTextItem } from "../pdf/text-items";
import { parsePageSpecs } from "../pdf/pages";
import type { Phase3CompositionData } from "../types";

export interface CompositionRow {
  section: string | null;
  component: string | null;
  composition: string | null;
  quantity: string | null;
}

interface RawCompositionRow extends CompositionRow {
  y: number;
}

const SECTION_LABEL =
  /^(fixation materials|jointing materials|treatments|packaging|product)$/i;

const JOINTING_ITEM = /paper tape|jointing compound/i;

function rowKey(y: number, step = 4): number {
  return Math.round(y / step) * step;
}

function columnBounds(headerItems: PdfTextItem[]): { c1: number; c2: number } | null {
  const components = headerItems.find((i) => /^components$/i.test(i.str));
  const quantity = headerItems.find((i) => /^quantity$/i.test(i.str));
  const composition = headerItems.find((i) => /composition|ingredients/i.test(i.str));
  if (!components || !quantity) return null;
  const x1 = components.x;
  const x2 = composition?.x ?? (components.x + quantity.x) / 2;
  const x3 = quantity.x;
  return { c1: (x1 + x2) / 2, c2: (x2 + x3) / 2 };
}

function colOf(item: PdfTextItem, bounds: { c1: number; c2: number }): 1 | 2 | 3 {
  if (item.x < bounds.c1) return 1;
  if (item.x < bounds.c2) return 2;
  return 3;
}

function joinParts(parts: PdfTextItem[]): string {
  return parts
    .sort((a, b) => a.x - b.x)
    .map((p) => p.str)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripBullet(text: string): string {
  return text.replace(/^–\s*/g, "").trim();
}

/** Fix PDF spacing in quantities (e.g. `8 ,2 5 kg/m²` → `8,25 kg/m²`). */
function normalizeQuantity(raw: string | null): string | null {
  if (!raw) return null;
  let q = stripBullet(raw).replace(/\s+/g, " ");
  q = q.replace(/(\d)\s*,\s*(\d)\s+(\d)/g, "$1,$2$3");
  q = q.replace(/(\d)\s*,\s*(\d)/g, "$1,$2");
  q = q.replace(/(\d)\s+(\d)(?=\s*kg)/gi, "$1$2");
  q = q.replace(/pcs\s*\/\s*m/gi, "pcs/m");
  return q.trim() || null;
}

function productNameFromText(text: string): string | null {
  const t = text.replace(/\s+/g, " ").trim();
  if (!/Gyproc|product/i.test(t) || !/mm|board|panel/i.test(t)) return null;
  return t.replace(/\s*®\s*/g, "® ").replace(/\s+/g, " ").trim();
}

function inferSectionForIngredient(
  composition: string,
  currentSection: string | null,
  upcomingHeaders: { y: number; name: string }[]
): string {
  if (JOINTING_ITEM.test(composition)) return "Jointing materials";
  if (upcomingHeaders.some((h) => /jointing/i.test(h.name)) && currentSection === "Fixation materials") {
    return "Jointing materials";
  }
  return currentSection ?? "Product";
}

function bucketRows(items: PdfTextItem[]): Map<number, PdfTextItem[]> {
  const map = new Map<number, PdfTextItem[]>();
  for (const item of items) {
    let key = rowKey(item.y, 4);
    const existing = [...map.entries()].find(([, list]) =>
      list.some((p) => Math.abs(p.y - item.y) <= 3)
    );
    if (existing) key = existing[0];
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  return map;
}


export function parseCompositionFromTextItems(
  items: PdfTextItem[],
  page: number
): Phase3CompositionData | null {
  const headerItem = items.find((i) => /^components$/i.test(i.str));
  if (!headerItem) return null;
  const headerY = headerItem.y;

  const sectionEnd = items.find((i) => {
    const t = i.str.replace(/\s+/g, "");
    return /^1\.6/.test(t) || /^1\.6reference/i.test(t);
  });

  const headerCluster = items.filter((i) => Math.abs(i.y - headerY) <= 12);
  const bounds = columnBounds(headerCluster);
  if (!bounds) return null;

  const body = items.filter(
    (i) =>
      i.y < headerY - 4 &&
      (sectionEnd == null || i.y > sectionEnd.y + 4) &&
      !/^1\.5\b/i.test(i.str)
  );

  const buckets = bucketRows(body);
  // Ascending y: product name row appears before ingredient rows above it in the PDF.
  const rowKeys = [...buckets.keys()].sort((a, b) => a - b);

  let productName: string | null = null;
  for (const key of rowKeys) {
    const cluster = buckets.get(key)!;
    const byCol = { c1: [] as PdfTextItem[], c2: [] as PdfTextItem[], c3: [] as PdfTextItem[] };
    for (const item of cluster) {
      byCol[`c${colOf(item, bounds)}` as "c1" | "c2" | "c3"].push(item);
    }
    const c1 = joinParts(byCol.c1);
    const c2 = joinParts(byCol.c2);
    const product = productNameFromText(c1) ?? productNameFromText(`${c1} ${c2}`);
    if (product) productName = product;
  }

  const rawRows: RawCompositionRow[] = [];
  const sectionHeaders: { y: number; name: string }[] = [];
  let currentSection: string | null = "Product";

  for (const key of [...rowKeys].reverse()) {
    const cluster = buckets.get(key)!;
    const y = Math.round(cluster.reduce((s, i) => s + i.y, 0) / cluster.length);
    const byCol = { c1: [] as PdfTextItem[], c2: [] as PdfTextItem[], c3: [] as PdfTextItem[] };
    for (const item of cluster) {
      byCol[`c${colOf(item, bounds)}` as "c1" | "c2" | "c3"].push(item);
    }
    const c1 = joinParts(byCol.c1);
    const c2 = joinParts(byCol.c2);
    const c3 = normalizeQuantity(joinParts(byCol.c3));
    if (!c1 && !c2 && !c3) continue;
    if (/^components$/i.test(c1) && /quantity/i.test(c3 ?? "")) continue;
    if (/candidate list|very high concern|authorization/i.test(c1 + c2)) continue;

    const product = productNameFromText(c1) ?? productNameFromText(`${c1} ${c2}`);
    if (product) {
      productName = product;
      currentSection = "Product";
      const inlineIngredient = stripBullet(c2);
      if (inlineIngredient && c3 && !/^Gyproc|®\s*WR/i.test(inlineIngredient)) {
        rawRows.push({
          y,
          section: "Product",
          component: productName,
          composition: inlineIngredient,
          quantity: c3,
        });
      }
      continue;
    }

    if (c1 && SECTION_LABEL.test(c1) && !c2 && !c3) {
      currentSection = c1;
      sectionHeaders.push({ y, name: c1 });
      continue;
    }

    if (c1 && SECTION_LABEL.test(c1) && (c2 || c3)) {
      currentSection = c1;
      sectionHeaders.push({ y, name: c1 });
      const ingredient = stripBullet(c2);
      rawRows.push({
        y,
        section: c1,
        component: ingredient || c1,
        composition: null,
        quantity: c3,
      });
      continue;
    }

    const upcomingHeaders = sectionHeaders.filter((h) => h.y < y);

    if (!c1 && c2 && c3) {
      const composition = stripBullet(c2);
      const section = inferSectionForIngredient(composition, currentSection, upcomingHeaders);
      const isProduct = section === "Product";
      rawRows.push({
        y,
        section,
        component: isProduct ? (productName ?? composition) : composition,
        composition: isProduct ? composition : null,
        quantity: c3,
      });
      continue;
    }

    if (c1 && c2 && c3) {
      rawRows.push({
        y,
        section: currentSection,
        component: c1,
        composition: stripBullet(c2),
        quantity: c3,
      });
      continue;
    }

    if (c1 && !c2 && !c3 && !SECTION_LABEL.test(c1)) {
      sectionHeaders.push({ y, name: c1 });
    }
  }

  const rows: CompositionRow[] = rawRows.map((row) => {
    let section = row.section;
    const label = `${row.component ?? ""} ${row.composition ?? ""}`.toLowerCase();
    if (/pallet|pet strap|packaging/i.test(label)) section = "Packaging";
    if (/screw/i.test(label)) section = "Fixation materials";
    if (JOINTING_ITEM.test(label)) section = "Jointing materials";
    return {
      section,
      component: row.component,
      composition: row.composition,
      quantity: row.quantity,
    };
  });

  const declarations: string[] = [];
  const declItem = items.find((i) =>
    /candidate list|substances of very high concern/i.test(i.str)
  );
  if (declItem) {
    const declText = declItem.str.replace(/\s+/g, " ").trim();
    if (declText.length > 20) declarations.push(declText);
  }

  if (!rows.length) return null;

  return {
    components: rows,
    declarations: declarations.length ? declarations : null,
  };
}

export async function parseCompositionFromPdfPage(
  pdfPath: string,
  pageNum: number
): Promise<Phase3CompositionData | null> {
  const items = await extractPdfPageTextItems(pdfPath, pageNum);
  const parsed = parseCompositionFromTextItems(items, pageNum);
  if (!parsed) return null;
  return {
    ...parsed,
    _source: {
      extracted_by: "pdf-composition-table-parser",
      extracted_at: new Date().toISOString(),
      api_pages: String(pageNum),
      composition_parser_page: pageNum,
    },
  };
}

export async function parseCompositionFromPdf(
  pdfPath: string,
  pageSpec: string
): Promise<Phase3CompositionData | null> {
  for (const page of parsePageSpecs(pageSpec)) {
    const parsed = await parseCompositionFromPdfPage(pdfPath, page);
    if (parsed?.components.length) return parsed;
  }
  return null;
}
