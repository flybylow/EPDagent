import { createRequire } from "node:module";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

function pdfjsRootDir(): string {
  try {
    const require = createRequire(import.meta.url);
    const pkg = require.resolve("pdfjs-dist/package.json");
    if (typeof pkg === "string") {
      return path.dirname(pkg);
    }
  } catch {
    /* bundled context — fall through */
  }
  return path.join(process.cwd(), "node_modules", "pdfjs-dist");
}

/** Resolve pdfjs assets on disk (Next.js must not bundle pdfjs-dist). */
function pdfjsAssetUrl(...segments: string[]): string {
  return pathToFileURL(path.join(pdfjsRootDir(), ...segments)).href;
}

let workerConfigured = false;

function ensurePdfjsWorker(): void {
  if (workerConfigured || pdfjs.GlobalWorkerOptions.workerSrc) {
    workerConfigured = true;
    return;
  }
  pdfjs.GlobalWorkerOptions.workerSrc = pdfjsAssetUrl(
    "legacy",
    "build",
    "pdf.worker.mjs"
  );
  workerConfigured = true;
}

/** Shared options for server-side PDF text extraction (docmap, TOC scan). */
export function pdfjsDocumentOptions(data: Uint8Array) {
  ensurePdfjsWorker();
  return {
    data,
    disableFontFace: true,
    standardFontDataUrl: pdfjsAssetUrl("standard_fonts"),
    cMapUrl: pdfjsAssetUrl("cmaps"),
    cMapPacked: true,
  };
}

export { pdfjs };
