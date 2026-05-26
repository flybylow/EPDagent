import * as fs from "node:fs";
import * as path from "node:path";
import { phase2PageRange } from "../pdf/pages";
import { getReferenceByStem, referenceCompareDir } from "../reference";

/** Per-EPD page list for phase 2 (reference manifest) or env default. */
export function resolvePhase2PageSpec(stem: string): string {
  const ref = getReferenceByStem(stem);
  if (ref) {
    const manifestPath = path.join(referenceCompareDir(ref.id), "manifest.json");
    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as {
        phase2Pages?: string;
      };
      if (manifest.phase2Pages?.trim()) {
        return manifest.phase2Pages.trim();
      }
    }
  }
  return phase2PageRange();
}
