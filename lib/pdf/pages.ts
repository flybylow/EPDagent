import { PDFDocument } from "pdf-lib";
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { OUT_DIR } from "../paths";

export const PDF_SLICES_DIR = path.join(OUT_DIR, "pdf_slices");

/** 1-based inclusive page range for phase 2 header extraction. */
export function phase2PageRange(): string {
  return process.env.EPDAGENT_PHASE2_PAGES?.trim() || "1-4";
}

export interface PageRange {
  start: number;
  end: number;
  label: string;
}

/** Parse "1-4" or "3" into a 1-based inclusive range. */
export function parsePageRange(spec: string): PageRange {
  const trimmed = spec.trim();
  const dash = trimmed.indexOf("-");
  if (dash === -1) {
    const page = Number(trimmed);
    if (!Number.isInteger(page) || page < 1) {
      throw new Error(`Invalid page spec "${spec}". Use "1-4" or a single page number.`);
    }
    return { start: page, end: page, label: `p${page}` };
  }

  const start = Number(trimmed.slice(0, dash));
  const end = Number(trimmed.slice(dash + 1));
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start) {
    throw new Error(`Invalid page spec "${spec}". Use "1-4" with start <= end.`);
  }
  return { start, end, label: `p${start}-${end}` };
}

export interface PdfSliceResult {
  bytes: Buffer;
  pages: number[];
  pageRange: string;
  totalPages: number;
  byteSize: number;
  sha256: string;
  exportPath: string | null;
  /** Pages from the spec that exceeded document length (docmap printed numbers, etc.). */
  droppedPages?: number[];
}

/** Keep in-range pages; if none remain, use the last `tailCount` pages of the PDF. */
export function fitPagesToDocument(
  requested: number[],
  totalPages: number,
  tailCount = 4
): { pages: number[]; dropped: number[] } {
  const dropped = requested.filter((p) => p > totalPages);
  const pages = requested.filter((p) => p >= 1 && p <= totalPages);
  if (pages.length > 0) {
    return { pages: [...new Set(pages)].sort((a, b) => a - b), dropped };
  }
  const start = Math.max(1, totalPages - tailCount + 1);
  const tail = Array.from({ length: totalPages - start + 1 }, (_, i) => start + i);
  return { pages: tail, dropped };
}

/**
 * Extract PDF pages for API upload (single range or comma list, e.g. "1-4,18,21").
 */
export function parsePageSpecs(spec: string): number[] {
  const pages = new Set<number>();
  for (const part of spec.split(",").map((s) => s.trim()).filter(Boolean)) {
    if (part.includes("-")) {
      const range = parsePageRange(part);
      for (let p = range.start; p <= range.end; p++) pages.add(p);
    } else {
      const page = Number(part);
      if (!Number.isInteger(page) || page < 1) {
        throw new Error(`Invalid page spec "${spec}". Use "1-4,18,21" or single pages.`);
      }
      pages.add(page);
    }
  }
  return [...pages].sort((a, b) => a - b);
}

function pageListLabel(pages: number[]): string {
  return pages.map((p) => `p${p}`).join("-");
}

/** Slice a comma/range page spec (e.g. "1-4,18,21") for API upload. */
export async function slicePdfByPageSpec(
  pdfPath: string,
  pageSpec: string,
  options: { export?: boolean; stem?: string } = {}
): Promise<PdfSliceResult> {
  const requested = pageSpec.trim() ? parsePageSpecs(pageSpec) : [];

  const srcBytes = fs.readFileSync(pdfPath);
  const srcDoc = await PDFDocument.load(srcBytes, { ignoreEncryption: true });
  const totalPages = srcDoc.getPageCount();

  const { pages, dropped } = fitPagesToDocument(requested, totalPages);
  const pageIndexes = pages.map((p) => p - 1);

  const outDoc = await PDFDocument.create();
  const copied = await outDoc.copyPages(srcDoc, pageIndexes);
  for (const page of copied) outDoc.addPage(page);

  const bytes = Buffer.from(await outDoc.save());
  const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
  const pageRange = pages.join(",");

  let exportPath: string | null = null;
  if (options.export !== false) {
    const stem = options.stem ?? path.basename(pdfPath, path.extname(pdfPath));
    fs.mkdirSync(PDF_SLICES_DIR, { recursive: true });
    exportPath = path.join(PDF_SLICES_DIR, `${stem}.${pageListLabel(pages)}.pdf`);
    fs.writeFileSync(exportPath, bytes);
  }

  return {
    bytes,
    pages,
    pageRange,
    totalPages,
    byteSize: bytes.length,
    sha256,
    exportPath,
    droppedPages: dropped.length ? dropped : undefined,
  };
}
