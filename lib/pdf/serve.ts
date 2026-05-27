import * as fs from "node:fs";
import * as path from "node:path";
import { NextResponse } from "next/server";
import { resolvePdfPathForStem } from "../data";

export function pdfExistsForStem(stem: string): boolean {
  return resolvePdfPathForStem(stem) !== null;
}

/** HTTP headers must be ASCII; use RFC 5987 when the on-disk name has Unicode (e.g. curly quotes). */
function contentDispositionInline(filename: string): string {
  const safe = filename.replace(/[\r\n"]/g, "");
  const ascii = safe.replace(/[^\x20-\x7E]/g, "_");
  if (ascii === safe) {
    return `inline; filename="${ascii}"`;
  }
  return `inline; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(safe)}`;
}

export function pdfResponseForStem(stem: string): NextResponse {
  const pdfPath = resolvePdfPathForStem(stem);
  if (!pdfPath) {
    return NextResponse.json(
      { error: `PDF not found — add data/EPD/${stem}.pdf (or set phase1 pdf_stem)` },
      { status: 404 }
    );
  }

  const bytes = fs.readFileSync(pdfPath);
  const filename = path.basename(pdfPath);
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": contentDispositionInline(filename),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
