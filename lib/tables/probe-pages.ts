import type { TableExportDef } from "./types";

/** PDF pages sent to the phase4 probe API (may span narrative + table). */
export function probePageSpecForTable(table: TableExportDef): string {
  return table.probePages?.trim() || String(table.page);
}
