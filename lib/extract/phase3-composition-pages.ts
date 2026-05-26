import { tableRegistryForStem } from "../tables/manifest";
import { getReferenceByStem, referenceCompareDir } from "../reference";
import * as fs from "node:fs";
import * as path from "node:path";

/** Page(s) for the composition table (§1.5). */
export function resolvePhase3CompositionPageSpec(stem: string): string {
  const ref = getReferenceByStem(stem);
  if (ref) {
    const manifestPath = path.join(referenceCompareDir(ref.id), "manifest.json");
    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as {
        phase3CompositionPages?: string;
      };
      if (manifest.phase3CompositionPages?.trim()) {
        return manifest.phase3CompositionPages.trim();
      }
    }
  }

  const tables = tableRegistryForStem(stem).filter((t) => t.phase === "phase3_composition");
  if (tables.length > 0) {
    const pages = [...new Set(tables.map((t) => t.page))].sort((a, b) => a - b);
    const min = pages[0]!;
    const max = pages[pages.length - 1]!;
    return min === max ? String(min) : `${min}-${max}`;
  }

  return process.env.EPDAGENT_PHASE3_COMPOSITION_PAGES?.trim() || "3";
}
