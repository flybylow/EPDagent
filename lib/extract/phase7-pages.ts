import * as fs from "node:fs";
import * as path from "node:path";
import { isPhase7TargetSection } from "../navigation/title-match";
import { parsePageSpecs } from "../pdf/pages";
import { getReferenceByStem, referenceCompareDir } from "../reference";
import {
  mergePageSpecs,
  pageSpecFromNumbers,
  pagesFromDocmapSections,
  pagesFromDocmapTargetSpans,
} from "./phase-page-spec";

function readManifestPhase7Pages(stem: string): string | null {
  const ref = getReferenceByStem(stem);
  if (!ref) return null;
  const manifestPath = path.join(referenceCompareDir(ref.id), "manifest.json");
  if (!fs.existsSync(manifestPath)) return null;
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as Record<string, string>;
  return manifest.phase7Pages?.trim() || null;
}

/** PDF pages for narrative sections (11–16, LCA interpretation §13, etc.). */
export function resolvePhase7PageSpec(stem: string): string {
  const manifest = readManifestPhase7Pages(stem);
  if (manifest) return manifest;

  const spanPages = pagesFromDocmapTargetSpans(stem, isPhase7TargetSection);
  const pointPages = pagesFromDocmapSections(
    stem,
    (n) => /^1[1-6](\.|$)/.test(n) || /^13(\.|$)/.test(n)
  );
  const merged = mergePageSpecs(spanPages, pointPages);
  if (merged) return merged;

  return process.env.EPDAGENT_PHASE7_PAGES?.trim() ?? "";
}

/** Extend the high end of a page spec by N pages (for phase 7 retry). */
export function widenPhase7PageSpec(spec: string, extraPages: number, totalPages: number): string {
  if (!spec.trim() || extraPages <= 0) return spec;
  const pages = parsePageSpecs(spec).filter((p) => p >= 1 && p <= totalPages);
  if (!pages.length) return spec;
  const max = Math.max(...pages);
  for (let p = max + 1; p <= max + extraPages && p <= totalPages; p++) pages.push(p);
  return pageSpecFromNumbers(pages) ?? spec;
}
