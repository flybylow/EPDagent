import { tableRegistryForStem } from "../tables/manifest";
import { resolveManifestOrDocmapPages } from "./phase-page-spec";

export function resolvePhase4PageSpec(stem: string, tableId = "lca_impacts"): string {
  const fromManifest = resolveManifestOrDocmapPages(
    stem,
    "phase4Pages",
    "4",
    "EPDAGENT_PHASE4_PAGES"
  );
  if (fromManifest) return fromManifest;

  const table = tableRegistryForStem(stem).find((t) => t.id === tableId);
  if (table?.page) return String(table.page);

  return "8";
}
