import * as fs from "node:fs";
import * as path from "node:path";
import type { SectionNavItem } from "../navigation/sections";
import { flattenNavItems } from "../navigation/sections";
import { resolveEpdPhases } from "../phases/registry";
import type { SectionAvailability } from "../templates/section-view-types";
import { resolveSectionAvailability } from "../templates/section-view-resolve";
import { loadTableManifest, tableRegistryForStem } from "../tables/manifest";
import { OUT_DIR, ROOT } from "../paths";
import {
  loadGapLocks,
  type GapLockEntry,
  type GapLockStatus,
} from "./gap-lock";

export type GapReason =
  | "visual_only"
  | "phase4_probe"
  | "phase7_narrative"
  | "phase5_scenarios"
  | "phase6_refs"
  | "phase3_extract"
  | "phase2_header"
  | "pipeline_pending"
  | "no_mapping"
  | "phase_empty"
  | "unknown";

export interface GapRow {
  sectionId: string;
  number: string;
  title: string;
  page: number | null;
  phaseId: string | null;
  tableId: string | null;
  view: string | null;
  gapReason: GapReason;
  pendingMessage: string | null;
  lockStatus: GapLockStatus;
  lockNote: string | null;
}

export interface GapReport {
  stem: string;
  generatedAt: string;
  summary: {
    totalSections: number;
    gaps: number;
    open: number;
    accepted: number;
    fixed: number;
    byReason: Record<string, number>;
  };
  gaps: GapRow[];
}

function safeStemFile(stem: string): string {
  return stem.replace(/[^\w.-]+/g, "_").slice(0, 120);
}

export function gapSnapshotPath(stem: string): string {
  return path.join(OUT_DIR, "gap_reports", `${safeStemFile(stem)}.json`);
}

export function diagnoseGapReason(
  section: SectionNavItem,
  availability: SectionAvailability
): GapReason {
  if (availability.hasVisualExport && !availability.hasExtractedContent) {
    return "visual_only";
  }
  const msg = (availability.pendingMessage ?? "").toLowerCase();
  if (/phase4|lca-probe|phase4-probe/.test(msg)) return "phase4_probe";
  if (/phase7/.test(msg)) return "phase7_narrative";
  if (/phase5|scenario/.test(msg)) return "phase5_scenarios";
  if (/phase6|ref/.test(msg)) return "phase6_refs";
  if (/phase3-composition|composition/.test(msg)) return "phase3_extract";
  if (/phase3-lca|lca study/.test(msg)) return "phase3_extract";
  if (/phase3|technical/.test(msg)) return "phase3_extract";
  if (/phase2|draft/.test(msg)) return "phase2_header";
  if (/docmap|npm run|missing steps/.test(msg)) return "pipeline_pending";
  if (/no content template|no template mapping/.test(msg)) return "no_mapping";
  if (section.phaseId && !availability.hasExtractedContent) return "phase_empty";
  return "unknown";
}

export function buildGapReport(stem: string): GapReport {
  const registry = resolveEpdPhases(stem, { pdfAvailable: true });
  const locks = loadGapLocks(stem);
  const flat = flattenNavItems(registry.sectionNav.items);
  const exportedTableIds =
    loadTableManifest(stem)?.tables.map((t) => t.id) ??
    tableRegistryForStem(stem).map((t) => t.id);

  const content = {
    stem: registry.stem,
    draft: registry.draft,
    phase1: registry.phase1,
    phase2: registry.phase2,
    phase3: registry.phase3,
    phase3Composition: registry.phase3Composition,
    phase3LcaStudy: registry.phase3LcaStudy,
    phase4Probe: registry.phase4Probe,
    phase4Probes: registry.phase4Probes,
    phase5: registry.phase5,
    phase6: registry.phase6,
    phase7: registry.phase7,
    phases: registry.phases,
    exportedTableIds,
  };

  const gaps: GapRow[] = [];
  for (const section of flat) {
    if (section.id === "__header__") continue;
    const availability = resolveSectionAvailability(
      section,
      content,
      true,
      registry.sectionViewTemplate
    );
    const isGap =
      availability.hasPdfLink &&
      !availability.hasExtractedContent &&
      !availability.hasVisualExport;
    if (!isGap) continue;

    const lock: GapLockEntry | undefined = locks.locks[section.id];
    const lockStatus: GapLockStatus = lock?.status ?? "open";
    gaps.push({
      sectionId: section.id,
      number: section.number,
      title: section.title,
      page: section.page,
      phaseId: section.phaseId,
      tableId: section.tableId,
      view: availability.view?.view ?? null,
      gapReason: diagnoseGapReason(section, availability),
      pendingMessage: availability.pendingMessage,
      lockStatus,
      lockNote: lock?.note ?? null,
    });
  }

  const byReason: Record<string, number> = {};
  for (const g of gaps) {
    byReason[g.gapReason] = (byReason[g.gapReason] ?? 0) + 1;
  }

  return {
    stem,
    generatedAt: new Date().toISOString(),
    summary: {
      totalSections: flat.filter((s) => s.id !== "__header__").length,
      gaps: gaps.length,
      open: gaps.filter((g) => g.lockStatus === "open").length,
      accepted: gaps.filter((g) => g.lockStatus === "accepted").length,
      fixed: gaps.filter((g) => g.lockStatus === "fixed").length,
      byReason,
    },
    gaps,
  };
}

export function writeGapSnapshot(report: GapReport): string {
  const file = gapSnapshotPath(report.stem);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(report, null, 2));
  return file;
}

export function readGapSnapshot(stem: string): GapReport | null {
  const file = gapSnapshotPath(stem);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf-8")) as GapReport;
}

/** Human-readable delta vs previous snapshot (for algorithm tuning). */
export function diffGapSnapshots(
  before: GapReport,
  after: GapReport
): { resolved: string[]; newGaps: string[]; openDelta: number } {
  const beforeIds = new Set(before.gaps.map((g) => g.sectionId));
  const afterIds = new Set(after.gaps.map((g) => g.sectionId));
  const resolved = [...beforeIds].filter((id) => !afterIds.has(id));
  const newGaps = [...afterIds].filter((id) => !beforeIds.has(id));
  return {
    resolved,
    newGaps,
    openDelta: after.summary.open - before.summary.open,
  };
}

export const GAP_LOCKS_DIR = path.join(ROOT, "data", "gap-locks");
