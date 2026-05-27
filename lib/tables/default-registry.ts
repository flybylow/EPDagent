import * as fs from "node:fs";
import * as path from "node:path";
import type { FlatTocEntry } from "../extract/docmap-parse";
import { PHASE_DIRS } from "../paths";
import type { TableExportDef } from "./types";

function loadDocmapFlat(stem: string): FlatTocEntry[] {
  const file = path.join(PHASE_DIRS.phase_docmap, `${stem}.json`);
  if (!fs.existsSync(file)) return [];
  const data = JSON.parse(fs.readFileSync(file, "utf-8")) as { flat_entries?: FlatTocEntry[] };
  return data.flat_entries ?? [];
}

const DEFAULT_LCA: Array<{ id: string; section: string; fallbackTitle: string }> = [
  { id: "lca_impacts", section: "6", fallbackTitle: "Potential environmental impacts" },
  { id: "lca_resource", section: "7", fallbackTitle: "Resource use" },
  { id: "lca_waste", section: "8", fallbackTitle: "Waste categories & output flows" },
  { id: "lca_additional", section: "9", fallbackTitle: "Additional impact categories" },
];

/** LCA table defs from docmap when no reference tables.json exists for this stem. */
export function defaultTableRegistryForStem(stem: string): TableExportDef[] {
  const flat = loadDocmapFlat(stem);
  const tables: TableExportDef[] = [];

  for (const def of DEFAULT_LCA) {
    const entry = flat.find((e) => e.number === def.section);
    if (!entry?.page) continue;
    tables.push({
      id: def.id,
      title: entry.title || def.fallbackTitle,
      phase: "phase4_lca",
      page: entry.page,
      section: def.section,
      probePages:
        def.id === "lca_additional"
          ? `${entry.page}-${entry.page + 1}`
          : String(entry.page),
    });
  }

  return tables;
}
