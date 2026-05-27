import type { LcaColumn, LcaTableRow, Phase4LcaProbeData } from "../types";

/** EN 15804+A2 module column order (single template for every LCA table). */
export const LCA_CANONICAL_MODULES = [
  "A1",
  "A2",
  "A3",
  "A4",
  "A5",
  "B1",
  "B2",
  "B3",
  "B4",
  "B5",
  "B6",
  "B7",
  "C1",
  "C2",
  "C3",
  "C4",
  "D",
] as const;

export type LcaCanonicalModule = (typeof LCA_CANONICAL_MODULES)[number];

export interface LcaExtraColumn {
  code: string;
  label: string | null;
}

export interface LcaCanonicalGridRow {
  indicator: string;
  unit: string | null;
  cells: Record<LcaCanonicalModule, string | null>;
  extraCells: Record<string, string | null>;
}

export interface LcaCanonicalGrid {
  modules: readonly LcaCanonicalModule[];
  extraColumns: LcaExtraColumn[];
  rows: LcaCanonicalGridRow[];
}

const CANONICAL_SET = new Set<string>(LCA_CANONICAL_MODULES);

function compactCode(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase();
}

/** Split grouped PDF headers (A1/A2/A3) into individual module codes. */
export function expandGroupedModuleCode(code: string | null): string[] {
  if (!code?.trim()) return [];
  const c = compactCode(code);
  if (/^A1[\/\-]A2[\/\-]A3$/.test(c)) return ["A1", "A2", "A3"];
  if (CANONICAL_SET.has(c)) return [c];
  return [];
}

function isCanonicalModule(code: string | null): code is LcaCanonicalModule {
  return !!code && CANONICAL_SET.has(compactCode(code));
}

function valueByColumnCode(row: LcaTableRow): Map<string, string | null> {
  const map = new Map<string, string | null>();
  for (const cell of row.values) {
    const code = cell.column_code?.trim();
    if (!code) continue;
    const expanded = expandGroupedModuleCode(code);
    if (expanded.length > 1) {
      const raw = cell.raw_value?.trim() || null;
      map.set(expanded[0], raw);
    } else {
      map.set(compactCode(code), cell.raw_value?.trim() || null);
    }
  }
  return map;
}

function indexColumnsByPosition(
  columns: LcaColumn[],
  row: LcaTableRow
): Map<string, string | null> {
  const map = valueByColumnCode(row);
  row.values.forEach((cell, index) => {
    const col = columns[index];
    if (!col) return;
    const code = col.code?.trim();
    if (!code) return;
    const raw = cell.raw_value?.trim() || null;
    const grouped = expandGroupedModuleCode(code);
    if (grouped.length > 1) {
      if (!map.has(grouped[0])) map.set(grouped[0], raw);
    } else {
      map.set(compactCode(code), raw);
    }
  });
  return map;
}

/**
 * Map probe extraction onto the canonical Indicator × A1…D grid.
 * Non-standard columns (e.g. Total) are appended after D.
 */
export function buildLcaCanonicalGrid(data: Phase4LcaProbeData): LcaCanonicalGrid {
  const extraColumns: LcaExtraColumn[] = [];

  for (const col of data.columns) {
    const code = col.code?.trim();
    if (!code) continue;
    const expanded = expandGroupedModuleCode(code);
    if (expanded.length > 1) continue;
    if (isCanonicalModule(code)) continue;
    const key = compactCode(code);
    if (!extraColumns.some((e) => e.code === key)) {
      extraColumns.push({ code: key, label: col.label ?? code });
    }
  }

  const rows: LcaCanonicalGridRow[] = data.rows.map((row) => {
    const byCode = indexColumnsByPosition(data.columns, row);
    const cells = Object.fromEntries(
      LCA_CANONICAL_MODULES.map((mod) => [mod, byCode.get(mod) ?? null])
    ) as Record<LcaCanonicalModule, string | null>;

    const extraCells: Record<string, string | null> = {};
    for (const extra of extraColumns) {
      extraCells[extra.code] = byCode.get(extra.code) ?? null;
    }

    return {
      indicator: row.indicator?.trim() || "—",
      unit: row.unit?.trim() || null,
      cells,
      extraCells,
    };
  });

  return {
    modules: LCA_CANONICAL_MODULES,
    extraColumns,
    rows,
  };
}
