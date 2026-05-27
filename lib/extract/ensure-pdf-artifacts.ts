import { canonicalExtractStem, pdfPathForStem } from "../data";
import { isServeOnlyDeploy } from "../deploy/serve-only";
import { docmapIsCached } from "./docmap-cache";

/**
 * Docmap + phase7 refresh from PDF text. Dynamic import so Vercel serve routes
 * never load pdfjs-dist (worker/canvas break on serverless).
 */
export async function ensurePdfArtifactsForStem(stem: string): Promise<void> {
  if (isServeOnlyDeploy() || !pdfPathForStem(stem)) return;

  const canonical = canonicalExtractStem(stem);
  if (!docmapIsCached(canonical)) {
    const { ensureDocmapForStem } = await import("./ensure-docmap");
    await ensureDocmapForStem(stem);
  }

  const { ensurePhase7ForStem } = await import("./ensure-phase7");
  await ensurePhase7ForStem(stem);
}
