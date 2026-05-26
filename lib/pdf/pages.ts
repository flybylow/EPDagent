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
}

/**
 * Extract a page range from a PDF for API upload.
 * Optionally writes the slice to out/pdf_slices/ for inspection and reuse.
 */
export async function slicePdfPages(
  pdfPath: string,
  pageSpec: string,
  options: { export?: boolean; stem?: string } = {}
): Promise<PdfSliceResult> {
  const range = parsePageRange(pageSpec);
  const srcBytes = fs.readFileSync(pdfPath);
  const srcDoc = await PDFDocument.load(srcBytes, { ignoreEncryption: true });
  const totalPages = srcDoc.getPageCount();

  if (range.start > totalPages) {
    throw new Error(
      `Page range ${pageSpec} starts at page ${range.start} but PDF has only ${totalPages} page(s).`
    );
  }

  const end = Math.min(range.end, totalPages);
  const pageIndexes = Array.from({ length: end - range.start + 1 }, (_, i) => range.start - 1 + i);
  const pages = pageIndexes.map((i) => i + 1);

  const outDoc = await PDFDocument.create();
  const copied = await outDoc.copyPages(srcDoc, pageIndexes);
  for (const page of copied) outDoc.addPage(page);

  const bytes = Buffer.from(await outDoc.save());
  const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
  const pageRange = pages.length === 1 ? String(pages[0]) : `${pages[0]}-${pages[pages.length - 1]}`;

  let exportPath: string | null = null;
  if (options.export !== false) {
    const stem = options.stem ?? path.basename(pdfPath, path.extname(pdfPath));
    fs.mkdirSync(PDF_SLICES_DIR, { recursive: true });
    exportPath = path.join(PDF_SLICES_DIR, `${stem}.${range.label}.pdf`);
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
  };
}
