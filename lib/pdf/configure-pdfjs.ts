import { createRequire } from "node:module";
import * as fs from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import { isServeOnlyDeploy } from "../deploy/serve-only";

const PDFJS_VERSION = "4.10.38";
const WORKER_CDN = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/legacy/build/pdf.worker.mjs`;

type PdfJsModule = typeof import("pdfjs-dist/legacy/build/pdf.mjs");

let pdfjsModule: PdfJsModule | null = null;
let pdfjsLoad: Promise<PdfJsModule> | null = null;

async function loadPdfjs(): Promise<PdfJsModule> {
  if (pdfjsModule) return pdfjsModule;
  if (!pdfjsLoad) {
    pdfjsLoad = import("pdfjs-dist/legacy/build/pdf.mjs").then((mod) => {
      pdfjsModule = mod;
      return mod;
    });
  }
  return pdfjsLoad;
}

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

function assetPath(...segments: string[]): string {
  return path.join(pdfjsRootDir(), ...segments);
}

/** Resolve pdfjs assets on disk, or CDN when missing (Vercel serverless bundle). */
function pdfjsAssetUrl(...segments: string[]): string {
  const local = assetPath(...segments);
  if (fs.existsSync(local)) {
    return pathToFileURL(local).href;
  }
  return `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/${segments.join("/")}`;
}

let workerConfigured = false;

function ensurePdfjsWorker(pdfjs: PdfJsModule): void {
  if (workerConfigured || pdfjs.GlobalWorkerOptions.workerSrc) {
    workerConfigured = true;
    return;
  }
  const localWorker = assetPath("legacy", "build", "pdf.worker.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = fs.existsSync(localWorker)
    ? pathToFileURL(localWorker).href
    : WORKER_CDN;
  workerConfigured = true;
}

/** Shared options for server-side PDF text extraction (docmap, TOC scan). */
export async function pdfjsDocumentOptions(data: Uint8Array) {
  if (isServeOnlyDeploy()) {
    throw new Error(
      "PDF text parsing is disabled on this deployment. Extract locally and commit out/phase_docmap/ and phase JSON."
    );
  }

  const pdfjs = await loadPdfjs();
  const isNode = typeof window === "undefined";

  if (!isNode) {
    ensurePdfjsWorker(pdfjs);
  }

  return {
    data,
    disableFontFace: true,
    useSystemFonts: true,
    /** Node serverless: no worker file — run in main thread. */
    disableWorker: isNode,
    standardFontDataUrl: pdfjsAssetUrl("standard_fonts"),
    cMapUrl: pdfjsAssetUrl("cmaps"),
    cMapPacked: true,
  };
}

export async function getPdfjs() {
  if (isServeOnlyDeploy()) {
    throw new Error(
      "PDF text parsing is disabled on this deployment. Extract locally and commit out/phase_docmap/ and phase JSON."
    );
  }
  return loadPdfjs();
}
