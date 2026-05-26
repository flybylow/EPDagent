import * as fs from "node:fs";
import * as path from "node:path";
import { parsePageSpecs } from "../pdf/pages";
import { getReferenceByStem, referenceCompareDir } from "../reference";
import { tableRegistryForStem } from "../tables/manifest";

/** Per-EPD page list for phase 3 (reference manifest) or table registry span. */
export function resolvePhase3PageSpec(stem: string): string {
  const ref = getReferenceByStem(stem);
  if (ref) {
    const manifestPath = path.join(referenceCompareDir(ref.id), "manifest.json");
    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as {
        phase3Pages?: string;
      };
      if (manifest.phase3Pages?.trim()) {
        return manifest.phase3Pages.trim();
      }
    }
  }

  const pages = new Set<number>();
  for (const table of tableRegistryForStem(stem)) {
    if (table.phase === "phase3_product" || table.phase === "phase3_composition") {
      pages.add(table.page);
    }
  }
  if (pages.size > 0) {
    const sorted = [...pages].sort((a, b) => a - b);
    const min = sorted[0]!;
    const max = sorted[sorted.length - 1]!;
    return min === max ? String(min) : `${min}-${max}`;
  }

  return process.env.EPDAGENT_PHASE3_PAGES?.trim() || "2-4";
}

export function phase3PageRange(): string {
  return process.env.EPDAGENT_PHASE3_PAGES?.trim() || "2-4";
}

/** Expand page spec to sorted unique page numbers. */
export function resolvePhase3Pages(stem: string): number[] {
  return parsePageSpecs(resolvePhase3PageSpec(stem));
}
