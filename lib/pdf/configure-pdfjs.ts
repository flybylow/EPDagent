import { createRequire } from "node:module";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

const require = createRequire(import.meta.url);
const pdfjsRoot = path.dirname(require.resolve("pdfjs-dist/package.json"));

/** Resolve pdfjs assets on disk (Next.js must not bundle pdfjs-dist). */
function pdfjsAssetUrl(...segments: string[]): string {
  return pathToFileURL(path.join(pdfjsRoot, ...segments)).href;
}

if (!pdfjs.GlobalWorkerOptions.workerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc = pdfjsAssetUrl(
    "legacy",
    "build",
    "pdf.worker.mjs"
  );
}

/** Shared options for server-side PDF text extraction (docmap, TOC scan). */
export function pdfjsDocumentOptions(data: Uint8Array) {
  return {
    data,
    disableFontFace: true,
    standardFontDataUrl: pdfjsAssetUrl("standard_fonts"),
    cMapUrl: pdfjsAssetUrl("cmaps"),
    cMapPacked: true,
  };
}

export { pdfjs };
