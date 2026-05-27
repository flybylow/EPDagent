export { resolvePhase5PageSpec } from "./phase5-pages";

import { resolveManifestOrDocmapPages } from "./phase-page-spec";

export function resolvePhase6PageSpec(stem: string): string {
  const spec = resolveManifestOrDocmapPages(
    stem,
    "phase6Pages",
    "15",
    "EPDAGENT_PHASE6_PAGES"
  );
  return spec || "20-21";
}
