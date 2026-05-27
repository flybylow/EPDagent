import * as fs from "node:fs";
import { tableRegistryForStem } from "../tables/manifest";
import { probePageSpecForTable } from "../tables/probe-pages";
import type { TableExportDef } from "../tables/types";
import type { Phase4LcaProbeData } from "../types";
import { phase4ProbeOutputPath } from "./phase4-probe-path";

function readProbe(filePath: string): Phase4LcaProbeData | null {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as Phase4LcaProbeData;
  } catch {
    return null;
  }
}

function probeSpecsForTable(table: TableExportDef): string[] {
  const specs: string[] = [];
  const primary = probePageSpecForTable(table);
  if (primary) specs.push(primary);
  const singlePage = String(table.page);
  if (!specs.includes(singlePage)) specs.push(singlePage);
  return specs;
}

export function loadPhase4ProbeForTable(
  stem: string,
  tableId: string,
  page?: number
): Phase4LcaProbeData | null {
  const table = tableRegistryForStem(stem).find((t) => t.id === tableId);
  const specs = new Set<string>();
  if (table) {
    for (const spec of probeSpecsForTable(table)) specs.add(spec);
  }
  if (page != null) specs.add(String(page));

  for (const spec of specs) {
    const byPage = readProbe(phase4ProbeOutputPath(stem, spec));
    if (byPage) return byPage;
  }

  const legacy = readProbe(phase4ProbeOutputPath(stem));
  if (legacy && tableId === "lca_impacts") return legacy;

  return null;
}

export function loadPhase4Probes(stem: string): Record<string, Phase4LcaProbeData> {
  const probes: Record<string, Phase4LcaProbeData> = {};
  const lcaTables = tableRegistryForStem(stem).filter((t) => t.phase === "phase4_lca");

  for (const table of lcaTables) {
    const probe = loadPhase4ProbeForTable(stem, table.id);
    if (probe) probes[table.id] = probe;
  }

  if (!lcaTables.length) {
    const legacy = readProbe(phase4ProbeOutputPath(stem));
    if (legacy) probes.lca_impacts = legacy;
  }

  return probes;
}

export function hasAnyPhase4Probe(stem: string): boolean {
  return Object.keys(loadPhase4Probes(stem)).length > 0;
}
