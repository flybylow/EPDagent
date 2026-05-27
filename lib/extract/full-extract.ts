import { pdfPathForStem } from "../data";
import { rebuildCorpus, writeGraphForStem } from "../graph/write";
import { writeDraftOutputs } from "../templates";
import { tableRegistryForStem } from "../tables/manifest";
import { probePageSpecForTable } from "../tables/probe-pages";
import { writeDocmap } from "./docmap";
import { runPhase1 } from "./phase1";
import { runPhase2 } from "./phase2";
import { runPhase3 } from "./phase3";
import { runPhase3Composition } from "./phase3-composition";
import { runPhase3LcaStudy } from "./phase3-lca-study";
import { runPhase4Probe } from "./phase4-probe";
import { runPhase5 } from "./phase5";
import { runPhase6 } from "./phase6";
import { runPhase7 } from "./phase7-epd-sections";
import { buildReferenceCoverageReport } from "./coverage-report";
import { buildGapReport, writeGapSnapshot } from "./gap-report";
import { loadPhase1, loadPhase2 } from "../data";
import { isExtractStepSkipped, summarizeExtractRun } from "./extract-plan-status";
import {
  buildExtractPlan,
  logExtractProgress,
  type ExtractProgressEvent,
} from "./progress";

export interface FullExtractStep {
  id: string;
  ok: boolean;
  skipped?: boolean;
  error?: string;
}

export type FullExtractProgressHandler = (event: ExtractProgressEvent) => void;

export interface FullExtractResult {
  stem: string;
  pdfPath: string;
  steps: FullExtractStep[];
  coverage: {
    ready: number;
    visual_only: number;
    pending: number;
    withPdf: number;
  };
  pendingSections: string[];
  /** Pipeline steps still uncached after this run. */
  pendingAfter: number;
  /** True when {@link maxSteps} stopped the run before everything was cached. */
  stoppedEarly: boolean;
}

async function runStep(
  id: string,
  fn: () => Promise<unknown>,
  options: { skipped?: boolean } = {}
): Promise<FullExtractStep> {
  if (options.skipped) {
    return { id, ok: true, skipped: true };
  }
  try {
    await fn();
    return { id, ok: true };
  } catch (err) {
    return { id, ok: false, error: (err as Error).message };
  }
}

async function runPlannedStep(
  meta: { id: string; label: string; index: number; total: number },
  fn: () => Promise<unknown>,
  options: { skipped?: boolean },
  onProgress?: FullExtractProgressHandler
): Promise<FullExtractStep> {
  onProgress?.({
    type: "start",
    stepId: meta.id,
    label: meta.label,
    index: meta.index,
    total: meta.total,
  });

  if (options.skipped) {
    onProgress?.({
      type: "skip",
      stepId: meta.id,
      label: meta.label,
      index: meta.index,
      total: meta.total,
    });
    const step: FullExtractStep = { id: meta.id, ok: true, skipped: true };
    onProgress?.({
      type: "done",
      stepId: meta.id,
      label: meta.label,
      index: meta.index,
      total: meta.total,
      ok: true,
      skipped: true,
    });
    return step;
  }

  const step = await runStep(meta.id, fn);
  onProgress?.({
    type: "done",
    stepId: meta.id,
    label: meta.label,
    index: meta.index,
    total: meta.total,
    ok: step.ok,
    error: step.error,
  });
  return step;
}

/**
 * Run all extraction phases for one EPD (reference-style pipeline).
 * Use force=true on re-extract so cached slices are refreshed.
 */
export async function runFullExtractForStem(
  stem: string,
  options: {
    force?: boolean;
    /** When true (default for dashboard), run only steps that are not cached. */
    pendingOnly?: boolean;
    /** Run at most this many non-skipped steps (for chunked / timeout-safe extracts). */
    maxSteps?: number;
    exportTables?: boolean;
    onProgress?: FullExtractProgressHandler;
  } = {}
): Promise<FullExtractResult> {
  const pdfPathRaw = pdfPathForStem(stem);
  if (!pdfPathRaw) {
    throw new Error(`PDF not found for ${stem}. Add the PDF to data/EPD/.`);
  }
  const pdfPath: string = pdfPathRaw;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is required for full extraction.");
  }

  const force = options.force ?? false;
  const pendingOnly = (options.pendingOnly ?? false) && !force;
  const exportTables = options.exportTables ?? false;
  const onProgress = options.onProgress;
  const plan = buildExtractPlan(stem, { exportTables });
  const labelById = new Map(plan.map((p) => [p.id, p.label]));
  const skipOpts = { force };

  const pendingIds = plan
    .filter((p) => !isExtractStepSkipped(stem, pdfPath, p.id, skipOpts))
    .map((p) => p.id);
  const progressTotal = pendingOnly ? pendingIds.length : plan.length;

  const stepMeta = (id: string, index: number) => ({
    id,
    label: labelById.get(id) ?? id,
    index,
    total: progressTotal,
  });

  onProgress?.({
    type: "plan",
    steps: pendingOnly ? plan.filter((p) => pendingIds.includes(p.id)) : plan,
  });

  const steps: FullExtractStep[] = [];
  let i = 0;
  const maxSteps = options.maxSteps;
  let ranSteps = 0;
  let hitStepLimit = false;

  async function enqueue(
    id: string,
    fn: () => Promise<unknown>
  ): Promise<void> {
    const cached = isExtractStepSkipped(stem, pdfPath, id, skipOpts);
    if (pendingOnly && cached) return;
    if (maxSteps != null && ranSteps >= maxSteps) {
      hitStepLimit = true;
      return;
    }
    ranSteps += 1;
    steps.push(
      await runPlannedStep(
        stepMeta(id, ++i),
        fn,
        { skipped: pendingOnly ? false : cached },
        onProgress
      )
    );
  }

  await enqueue("phase1", async () => {
    runPhase1(pdfPath);
  });
  await enqueue("docmap", () => writeDocmap(pdfPath));
  await enqueue("phase2", () => runPhase2(pdfPath, apiKey, { force }));
  await enqueue("phase3", () => runPhase3(pdfPath, apiKey, { force }));
  await enqueue("phase3-composition", () => runPhase3Composition(pdfPath, apiKey, { force }));
  await enqueue("phase3-lca-study", () => runPhase3LcaStudy(pdfPath, apiKey, { force }));

  const lcaTables = tableRegistryForStem(stem).filter((t) => t.phase === "phase4_lca");
  for (const table of lcaTables) {
    const id = `phase4-${table.id}`;
    const pageSpec = probePageSpecForTable(table);
    await enqueue(id, () =>
      runPhase4Probe(pdfPath, apiKey, {
        force,
        pageSpec,
      })
    );
  }

  await enqueue("phase5", () => runPhase5(pdfPath, apiKey, { force }));
  await enqueue("phase6", () => runPhase6(pdfPath, apiKey, { force }));
  await enqueue("phase7", () => runPhase7(pdfPath, apiKey, { force }));

  if (exportTables) {
    await enqueue("export-tables", async () => {
      const { exportTablePages } = await import("../tables/export-pages");
      await exportTablePages(pdfPath, stem, tableRegistryForStem(stem));
    });
  }

  await enqueue("drafts", async () => {
    writeGraphForStem(stem);
    rebuildCorpus();
    writeDraftOutputs(stem, { phase1: loadPhase1(stem), phase2: loadPhase2(stem) });
  });

  const report = buildReferenceCoverageReport(stem);
  writeGapSnapshot(buildGapReport(stem));
  const pendingSections = report.sections
    .filter((s) => s.status === "pending")
    .map((s) => `${s.number} ${s.title}`);

  const postRun = summarizeExtractRun(stem, { force: false });
  const pendingAfter = postRun.pendingCount;
  const stoppedEarly =
    hitStepLimit || (maxSteps != null && pendingAfter > 0 && ranSteps >= (maxSteps ?? 0));

  return {
    stem,
    pdfPath,
    steps,
    coverage: report.summary,
    pendingSections,
    pendingAfter,
    stoppedEarly,
  };
}
