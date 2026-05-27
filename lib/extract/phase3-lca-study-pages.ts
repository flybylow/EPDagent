import { mergePageSpecs, pagesFromDocmapSection } from "./phase-page-spec";
import { resolveManifestOrDocmapPages } from "./phase-page-spec";

export function resolvePhase3LcaStudyPageSpec(stem: string): string {
  const spec = resolveManifestOrDocmapPages(
    stem,
    "phase3LcaStudyPages",
    "3",
    "EPDAGENT_PHASE3_LCA_STUDY_PAGES"
  );
  const section5 = pagesFromDocmapSection(stem, "5");
  const merged = mergePageSpecs(spec, section5);
  return merged || spec || "8";
}

/** Pages for the §5 system-boundaries diagram only (pdf.js parser). */
export function resolveSystemBoundariesPageSpec(stem: string): string {
  return pagesFromDocmapSection(stem, "5") ?? "";
}
