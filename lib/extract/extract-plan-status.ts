import * as fs from "node:fs";
import * as path from "node:path";
import {
  phase2CacheStatus,
  phase3CacheStatus,
  phase3CompositionCacheStatus,
  phase3LcaStudyCacheStatus,
  phase5CacheStatus,
  phase6CacheStatus,
  phase7CacheStatus,
} from "../anthropic/guard";
import { pdfPathForStem } from "../data";
import { docmapIsCached } from "./docmap-cache";
import { DRAFTS_DIR, GRAPH_DIR, OUT_DIR } from "../paths";
import { tableRegistryForStem } from "../tables/manifest";
import { probePageSpecForTable } from "../tables/probe-pages";
import { phase4ProbeOutputPath } from "./phase4-probe-path";
import { buildExtractPlan, type ExtractPlanStep } from "./progress";

const API_STEP_IDS = new Set([
  "docmap",
  "phase2",
  "phase3",
  "phase3-composition",
  "phase3-lca-study",
  "phase5",
  "phase6",
  "phase7",
]);

export function isApiExtractStep(stepId: string): boolean {
  return API_STEP_IDS.has(stepId) || stepId.startsWith("phase4-");
}

/** Whether full-extract would skip this step (same rules as {@link runFullExtractForStem}). */
export function isExtractStepSkipped(
  stem: string,
  pdfPath: string,
  stepId: string,
  options: { force?: boolean } = {}
): boolean {
  const force = options.force ?? false;
  if (force) return false;

  switch (stepId) {
    case "phase1":
      return fs.existsSync(path.join(OUT_DIR, "phase1_filename", `${stem}.json`));
    case "docmap":
      return docmapIsCached(stem);
    case "phase2":
      return phase2CacheStatus(stem, pdfPath, false).skip;
    case "phase3":
      return phase3CacheStatus(stem, pdfPath, false).skip;
    case "phase3-composition":
      return phase3CompositionCacheStatus(stem, pdfPath, false).skip;
    case "phase3-lca-study":
      return phase3LcaStudyCacheStatus(stem, pdfPath, false).skip;
    case "phase5":
      return phase5CacheStatus(stem, pdfPath, false).skip;
    case "phase7":
      return phase7CacheStatus(stem, pdfPath, false).skip;
    case "phase6":
      return phase6CacheStatus(stem, pdfPath, false).skip;
    case "drafts":
      return (
        fs.existsSync(path.join(DRAFTS_DIR, stem, "draft.json")) &&
        fs.existsSync(path.join(GRAPH_DIR, `${stem}.jsonld`))
      );
    case "export-tables":
      return false;
    default:
      if (stepId.startsWith("phase4-")) {
        const tableId = stepId.slice("phase4-".length);
        const table = tableRegistryForStem(stem).find((t) => t.id === tableId);
        if (!table) return true;
        return fs.existsSync(phase4ProbeOutputPath(stem, probePageSpecForTable(table)));
      }
      return false;
  }
}

export interface ExtractRunSummary {
  hasPdf: boolean;
  totalSteps: number;
  runnableSteps: ExtractPlanStep[];
  apiRunnableSteps: ExtractPlanStep[];
  /** @deprecated Use pendingCount — kept for API compat */
  apiRunnableCount: number;
  pendingCount: number;
  upToDate: boolean;
}

export function summarizeExtractRun(
  stem: string,
  options: { force?: boolean } = {}
): ExtractRunSummary {
  const pdfPath = pdfPathForStem(stem);
  if (!pdfPath) {
    return {
      hasPdf: false,
      totalSteps: 0,
      runnableSteps: [],
      apiRunnableSteps: [],
      apiRunnableCount: 0,
      pendingCount: 0,
      upToDate: false,
    };
  }

  const plan = buildExtractPlan(stem);
  const runnableSteps = plan.filter(
    (step) => !isExtractStepSkipped(stem, pdfPath, step.id, options)
  );
  const apiRunnableSteps = runnableSteps.filter((step) => isApiExtractStep(step.id));

  return {
    hasPdf: true,
    totalSteps: plan.length,
    runnableSteps,
    apiRunnableSteps,
    apiRunnableCount: apiRunnableSteps.length,
    pendingCount: runnableSteps.length,
    upToDate: runnableSteps.length === 0,
  };
}
