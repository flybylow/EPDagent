import * as fs from "node:fs";
import { pdfjs, pdfjsDocumentOptions } from "./configure-pdfjs";
import { joinLineParts } from "./join-line-parts";

export interface PdfTextLine {
  y: number;
  parts: Array<{ x: number; text: string }>;
  text: string;
}

export async function extractPageLines(pdfPath: string, pageNum: number): Promise<PdfTextLine[]> {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjs.getDocument(pdfjsDocumentOptions(data)).promise;
  const page = await doc.getPage(pageNum);
  const content = await page.getTextContent();
  const byY = new Map<number, Array<{ x: number; text: string }>>();

  for (const item of content.items) {
    if (!("str" in item) || !item.str.trim()) continue;
    const y = Math.round(item.transform[5]);
    const x = Math.round(item.transform[4]);
    if (!byY.has(y)) byY.set(y, []);
    byY.get(y)!.push({ x, text: item.str.trim() });
  }

  return [...byY.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([y, parts]) => {
      parts.sort((a, b) => a.x - b.x);
      return { y, parts, text: joinLineParts(parts) };
    });
}

export async function extractPagesLines(
  pdfPath: string,
  pageNumbers: number[]
): Promise<Map<number, PdfTextLine[]>> {
  const out = new Map<number, PdfTextLine[]>();
  for (const pageNum of pageNumbers) {
    out.set(pageNum, await extractPageLines(pdfPath, pageNum));
  }
  return out;
}

export async function pdfPageCount(pdfPath: string): Promise<number> {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjs.getDocument(pdfjsDocumentOptions(data)).promise;
  return doc.numPages;
}
