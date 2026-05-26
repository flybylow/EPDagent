import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { resolvePhase2PageSpec } from "../extract/phase2-pages";
import { resolvePhase3CompositionPageSpec } from "../extract/phase3-composition-pages";
import { resolvePhase3PageSpec } from "../extract/phase3-pages";
import { PHASE_DIRS } from "../paths";
import type { Phase2Data, Phase3CompositionData, Phase3ProductData } from "../types";

const DEFAULT_MAX_PDF_BYTES = 5 * 1024 * 1024;
const DEFAULT_MAX_API_PDF_BYTES = 2 * 1024 * 1024;

export function maxPdfBytes(): number {
  const raw = process.env.EPDAGENT_MAX_PDF_BYTES?.trim();
  if (!raw) return DEFAULT_MAX_PDF_BYTES;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MAX_PDF_BYTES;
}

export function bulkApiAllowed(): boolean {
  return process.env.EPDAGENT_ALLOW_BULK_API === "1";
}

export function pdfSha256(pdfPath: string): string {
  const pdfBytes = fs.readFileSync(pdfPath);
  return crypto.createHash("sha256").update(pdfBytes).digest("hex");
}

export function pdfByteSize(pdfPath: string): number {
  return fs.statSync(pdfPath).size;
}

export function maxApiPdfBytes(): number {
  const raw = process.env.EPDAGENT_MAX_API_PDF_BYTES?.trim();
  if (!raw) return DEFAULT_MAX_API_PDF_BYTES;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MAX_API_PDF_BYTES;
}

export function assertPdfWithinBudget(pdfPath: string): void {
  const size = pdfByteSize(pdfPath);
  const max = maxPdfBytes();
  if (size > max) {
    throw new Error(
      `PDF too large (${size} bytes > ${max} limit). Set EPDAGENT_MAX_PDF_BYTES to override.`
    );
  }
}

export function assertApiPayloadWithinBudget(byteSize: number, context: string): void {
  const max = maxApiPdfBytes();
  if (byteSize > max) {
    throw new Error(
      `${context} too large for API budget (${byteSize} bytes > ${max} limit). Narrow EPDAGENT_PHASE2_PAGES or raise EPDAGENT_MAX_API_PDF_BYTES.`
    );
  }
}

export function assertBulkApiAllowed(): void {
  if (!bulkApiAllowed()) {
    throw new Error(
      "Bulk API calls blocked. Set EPDAGENT_ALLOW_BULK_API=1 to run --all, or extract one PDF at a time."
    );
  }
}

export interface Phase2CacheStatus {
  skip: boolean;
  reason?: string;
  outPath: string;
}

/** Skip phase 2 when cached output matches the current PDF hash. */
export function phase2CacheStatus(stem: string, pdfPath: string, force = false): Phase2CacheStatus {
  const outPath = path.join(PHASE_DIRS.phase2, `${stem}.json`);
  if (force || !fs.existsSync(outPath)) {
    return { skip: false, outPath };
  }

  const cached = JSON.parse(fs.readFileSync(outPath, "utf-8")) as Phase2Data;
  const cachedHash = cached._source?.pdf_sha256;
  const cachedPages = cached._source?.api_pages as string | undefined;
  const currentPages = resolvePhase2PageSpec(stem);
  if (!cachedHash) {
    return { skip: false, outPath };
  }

  const currentHash = pdfSha256(pdfPath);
  if (cachedHash === currentHash && cachedPages === currentPages) {
    return {
      skip: true,
      reason: `unchanged PDF + pages ${currentPages}; cached phase2 output exists (use --force to re-extract)`,
      outPath,
    };
  }

  return { skip: false, outPath };
}

export interface Phase3CacheStatus {
  skip: boolean;
  reason?: string;
  outPath: string;
}

/** Skip phase 3 when cached output matches the current PDF hash and page spec. */
export function phase3CacheStatus(stem: string, pdfPath: string, force = false): Phase3CacheStatus {
  const outPath = path.join(PHASE_DIRS.phase3, `${stem}.json`);
  if (force || !fs.existsSync(outPath)) {
    return { skip: false, outPath };
  }

  const cached = JSON.parse(fs.readFileSync(outPath, "utf-8")) as Phase3ProductData;
  const cachedHash = cached._source?.pdf_sha256;
  const cachedPages = cached._source?.api_pages as string | undefined;
  const currentPages = resolvePhase3PageSpec(stem);
  if (!cachedHash) {
    return { skip: false, outPath };
  }

  const currentHash = pdfSha256(pdfPath);
  if (cachedHash === currentHash && cachedPages === currentPages) {
    return {
      skip: true,
      reason: `unchanged PDF + pages ${currentPages}; cached phase3 output exists (use --force to re-extract)`,
      outPath,
    };
  }

  return { skip: false, outPath };
}

export interface Phase3CompositionCacheStatus {
  skip: boolean;
  reason?: string;
  outPath: string;
}

export function phase3CompositionCacheStatus(
  stem: string,
  pdfPath: string,
  force = false
): Phase3CompositionCacheStatus {
  const outPath = path.join(PHASE_DIRS.phase3_composition, `${stem}.json`);
  if (force || !fs.existsSync(outPath)) {
    return { skip: false, outPath };
  }

  const cached = JSON.parse(fs.readFileSync(outPath, "utf-8")) as Phase3CompositionData;
  const cachedHash = cached._source?.pdf_sha256;
  const cachedPages = cached._source?.api_pages as string | undefined;
  const currentPages = resolvePhase3CompositionPageSpec(stem);
  if (!cachedHash) {
    return { skip: false, outPath };
  }

  const currentHash = pdfSha256(pdfPath);
  if (cachedHash === currentHash && cachedPages === currentPages) {
    return {
      skip: true,
      reason: `unchanged PDF + pages ${currentPages}; cached phase3 composition exists (use --force to re-extract)`,
      outPath,
    };
  }

  return { skip: false, outPath };
}
