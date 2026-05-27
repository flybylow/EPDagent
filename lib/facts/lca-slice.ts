import { buildLcaCanonicalGrid, type LcaCanonicalGrid } from "../lca/canonical-grid";
import type { Phase4LcaProbeData } from "../types";
import type { LcaIndicatorSlice } from "./types";

function indicatorKey(indicator: string): string {
  return indicator
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function parseNumeric(raw: string | null): number | null {
  if (!raw?.trim()) return null;
  const n = Number(raw.replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function sumModules(
  cells: Record<string, string | null>,
  mods: string[]
): string | null {
  let sum = 0;
  let any = false;
  for (const mod of mods) {
    const v = parseNumeric(cells[mod] ?? null);
    if (v == null) continue;
    sum += v;
    any = true;
  }
  return any ? String(sum) : null;
}

function rowToSlice(
  indicator: string,
  unit: string | null,
  cells: Record<string, string | null>
): LcaIndicatorSlice {
  const modules: Record<string, string | null> = { ...cells };
  return {
    indicator,
    unit,
    modules,
    a1_a3: sumModules(cells, ["A1", "A2", "A3"]),
  };
}

function gridToIndicators(grid: LcaCanonicalGrid): Record<string, LcaIndicatorSlice> {
  const out: Record<string, LcaIndicatorSlice> = {};
  for (const row of grid.rows) {
    const key = indicatorKey(row.indicator);
    if (!key) continue;
    out[key] = rowToSlice(row.indicator, row.unit, row.cells);
  }
  return out;
}

/** Prefer main impact table; merge unique indicators from other probes. */
export function buildLcaIndicators(
  probes: Record<string, Phase4LcaProbeData>
): Record<string, LcaIndicatorSlice> {
  const order = ["lca_impacts", ...Object.keys(probes).filter((k) => k !== "lca_impacts")];
  const merged: Record<string, LcaIndicatorSlice> = {};

  for (const id of order) {
    const probe = probes[id];
    if (!probe) continue;
    const grid = buildLcaCanonicalGrid(probe);
    const slice = gridToIndicators(grid);
    for (const [key, row] of Object.entries(slice)) {
      if (!merged[key]) merged[key] = row;
    }
  }
  return merged;
}

export function pickPrimaryGwp(
  indicators: Record<string, LcaIndicatorSlice>
): LcaIndicatorSlice | null {
  return (
    indicators.gwp_total ??
    indicators.gwp_total_a2 ??
    Object.values(indicators).find((r) => /gwp/i.test(r.indicator)) ??
    null
  );
}
