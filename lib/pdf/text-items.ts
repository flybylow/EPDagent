import * as fs from "node:fs";
import { getPdfjs, pdfjsDocumentOptions } from "./configure-pdfjs";

export interface PdfTextItem {
  x: number;
  y: number;
  str: string;
  /** Degrees from PDF transform matrix (0 = horizontal). */
  rotation: number;
}

export async function extractPdfPageTextItems(
  pdfPath: string,
  pageNum: number
): Promise<PdfTextItem[]> {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const pdfjs = await getPdfjs();
  const doc = await pdfjs.getDocument(await pdfjsDocumentOptions(data)).promise;
  const page = await doc.getPage(pageNum);
  const content = await page.getTextContent();
  const items: PdfTextItem[] = [];

  for (const item of content.items) {
    if (!("str" in item) || !item.str.trim()) continue;
    const t = item.transform;
    const rotation = Math.round((Math.atan2(t[1], t[0]) * 180) / Math.PI);
    items.push({
      x: Math.round(t[4]),
      y: Math.round(t[5]),
      str: item.str.trim(),
      rotation,
    });
  }

  return items.sort((a, b) => b.y - a.y || a.x - b.x);
}
