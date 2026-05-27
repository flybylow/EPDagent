import * as fs from "node:fs";
import * as path from "node:path";
import { loadDocmapForStem } from "../phases/registry";
import { pageSpecFromNumbers } from "./phase-page-spec";
import { getReferenceByStem, referenceCompareDir } from "../reference";

function readManifestPhase2Pages(stem: string): string | null {
  const ref = getReferenceByStem(stem);
  if (!ref) return null;
  const manifestPath = path.join(referenceCompareDir(ref.id), "manifest.json");
  if (!fs.existsSync(manifestPath)) return null;
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as {
    phase2Pages?: string;
  };
  return manifest.phase2Pages?.trim() || null;
}

/**
 * Physical cover sheet only (default page 1).
 * Do not use docmap §1 — that is the product chapter (often page 5+), not the declaration cover.
 */
export function resolveCoverPageSpec(stem: string): string {
  const manifest = readManifestPhase2Pages(stem);
  if (manifest) {
    const first = manifest.split(",")[0]?.trim();
    if (first) return first;
  }
  return process.env.EPDAGENT_COVER_PAGES?.trim() || "1";
}

/** Verifier signature block when it is not on the cover (e.g. B-EPD §12 at end of PDF). */
export function resolveVerifierPageSpec(stem: string): string | null {
  const docmap = loadDocmapForStem(stem);
  if (!docmap?.flat_entries.length) return null;

  const pages = new Set<number>();
  for (const entry of docmap.flat_entries) {
    if (entry.page == null || entry.page < 1) continue;
    const n = entry.number.trim();
    const title = entry.title.toLowerCase();
    if (
      n === "12" ||
      /^12\.\d/.test(n) ||
      /demonstration of verification|verification of compliance/i.test(title)
    ) {
      pages.add(entry.page);
    }
  }

  const coverPages = new Set(
    resolveCoverPageSpec(stem)
      .split(",")
      .flatMap((part) => {
        if (part.includes("-")) {
          const [a, b] = part.split("-").map(Number);
          const out: number[] = [];
          for (let p = a; p <= b; p += 1) out.push(p);
          return out;
        }
        return [Number(part)];
      })
      .filter((p) => Number.isFinite(p))
  );

  const verifierOnly = [...pages].filter((p) => !coverPages.has(p));
  return pageSpecFromNumbers(verifierOnly);
}

/** Pages sent to Claude for phase 2 (cover first; verifier sheet appended when separate). */
export function resolvePhase2PageSpec(stem: string): string {
  const cover = resolveCoverPageSpec(stem);
  const verifier = resolveVerifierPageSpec(stem);
  if (!verifier) return cover;
  return `${cover},${verifier}`;
}
