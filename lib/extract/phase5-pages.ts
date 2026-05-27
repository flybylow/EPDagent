import { resolveManifestOrDocmapPages } from "./phase-page-spec";

export function resolvePhase5PageSpec(stem: string): string {
  const spec = resolveManifestOrDocmapPages(
    stem,
    "phase5Pages",
    "10",
    "EPDAGENT_PHASE5_PAGES"
  );
  return spec || "16-19";
}

export function resolvePhase6PageSpec(stem: string): string {
  const spec = resolveManifestOrDocmapPages(
    stem,
    "phase6Pages",
    "15",
    "EPDAGENT_PHASE6_PAGES"
  );
  return spec || "20-21";
}
