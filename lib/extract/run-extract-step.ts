import { loadPhase1, loadPhase2, pdfPathForStem } from "../data";
import { rebuildCorpus, writeGraphForStem } from "../graph/write";
import { writeDraftOutputs } from "../templates";
import { tableRegistryForStem } from "../tables/manifest";
import { probePageSpecForTable } from "../tables/probe-pages";
import { writeDocmap } from "./docmap";
import { buildGapReport, writeGapSnapshot } from "./gap-report";
import type { FullExtractStep } from "./full-extract";
import { runPhase1 } from "./phase1";
import { runPhase2 } from "./phase2";
import { runPhase3 } from "./phase3";
import { runPhase3Composition } from "./phase3-composition";
import { runPhase3LcaStudy } from "./phase3-lca-study";
import { resolvePhase3CompositionPageSpec } from "./phase3-composition-pages";
import { resolveSystemBoundariesPageSpec } from "./phase3-lca-study-pages";
import { runPhase4Probe } from "./phase4-probe";
import { runPhase5 } from "./phase5";
import { runPhase6 } from "./phase6";
import { runPhase7 } from "./phase7-epd-sections";
import { buildExtractPlan } from "./progress";

export interface RunExtractStepResult {
  stem: string;
  stepId: string;
  step: FullExtractStep;
}

const DRAFT_REFRESH_STEPS = new Set([
  "phase2",
  "phase3",
  "phase3-composition",
  "phase3-lca-study",
  "phase5",
  "phase6",
  "phase7",
]);

function planStepIds(stem: string): Set<string> {
  return new Set(buildExtractPlan(stem).map((p) => p.id));
}

export async function runExtractStepForStem(
  stem: string,
  stepId: string,
  options: { force?: boolean } = {}
): Promise<RunExtractStepResult> {
  const pdfPath = pdfPathForStem(stem);
  if (!pdfPath) {
    throw new Error(`PDF not found for ${stem}`);
  }

  const allowed = planStepIds(stem);
  if (!allowed.has(stepId)) {
    throw new Error(`Unknown or unavailable extract step: ${stepId}`);
  }

  const force = options.force ?? false;
  let step: FullExtractStep;

  try {
    if (stepId === "phase1") {
      runPhase1(pdfPath);
      step = { id: stepId, ok: true };
    } else if (stepId === "docmap") {
      await writeDocmap(pdfPath);
      step = { id: stepId, ok: true };
    } else {
      const apiKeyEnv = process.env.ANTHROPIC_API_KEY?.trim();
      const needsApi =
        (stepId !== "phase3-lca-study" || !resolveSystemBoundariesPageSpec(stem)) &&
        (stepId !== "phase3-composition" || !resolvePhase3CompositionPageSpec(stem));
      if (needsApi && !apiKeyEnv) {
        throw new Error("ANTHROPIC_API_KEY is required for this extract step.");
      }
      const requireApiKey = (): string => {
        if (!apiKeyEnv) {
          throw new Error("ANTHROPIC_API_KEY is required for this extract step.");
        }
        return apiKeyEnv;
      };

      if (stepId === "phase2") {
        await runPhase2(pdfPath, requireApiKey(), { force });
      } else if (stepId === "phase3") {
        await runPhase3(pdfPath, requireApiKey(), { force });
      } else if (stepId === "phase3-composition") {
        await runPhase3Composition(pdfPath, apiKeyEnv, { force });
      } else if (stepId === "phase3-lca-study") {
        await runPhase3LcaStudy(pdfPath, apiKeyEnv, { force });
      } else if (stepId === "phase5") {
        await runPhase5(pdfPath, requireApiKey(), { force });
      } else if (stepId === "phase6") {
        await runPhase6(pdfPath, requireApiKey(), { force });
      } else if (stepId === "phase7") {
        await runPhase7(pdfPath, requireApiKey(), { force });
      } else if (stepId.startsWith("phase4-")) {
        const tableId = stepId.slice("phase4-".length);
        const table = tableRegistryForStem(stem).find((t) => t.id === tableId);
        if (!table) {
          throw new Error(`LCA table not found: ${tableId}`);
        }
        await runPhase4Probe(pdfPath, requireApiKey(), {
          force,
          pageSpec: probePageSpecForTable(table),
        });
      } else {
        throw new Error(`Step not runnable: ${stepId}`);
      }
      step = { id: stepId, ok: true };
    }
  } catch (err) {
    step = { id: stepId, ok: false, error: (err as Error).message };
  }

  if (step.ok && (stepId === "phase2" || DRAFT_REFRESH_STEPS.has(stepId))) {
    writeGraphForStem(stem);
    rebuildCorpus();
    writeDraftOutputs(stem, {
      phase1: loadPhase1(stem),
      phase2: loadPhase2(stem),
    });
  }

  if (step.ok) {
    writeGapSnapshot(buildGapReport(stem));
  }

  if (!step.ok) {
    throw new Error(step.error ?? `Extract step failed: ${stepId}`);
  }

  return { stem, stepId, step };
}
