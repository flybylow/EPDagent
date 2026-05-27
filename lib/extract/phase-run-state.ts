import type { FullExtractStep } from "./full-extract";
import { extractStepToPhaseId } from "./step-phase-map";
import type { PhaseStatus } from "../phases/registry";

export type PhaseRunState = "pending" | "running" | "done" | "skipped" | "failed";

export type PhaseRunTone = "ready" | "visual" | "pending" | "empty" | "active" | "failed";

export function phaseRunStatesFromSteps(steps: FullExtractStep[]): Record<string, PhaseRunState> {
  const out: Record<string, PhaseRunState> = {};
  for (const step of steps) {
    const phaseId = extractStepToPhaseId(step.id);
    if (!phaseId) continue;
    if (step.skipped) out[phaseId] = "skipped";
    else if (step.ok) out[phaseId] = "done";
    else out[phaseId] = "failed";
  }
  return out;
}

export function stepErrorsFromSteps(steps: FullExtractStep[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const step of steps) {
    if (step.ok || step.skipped || !step.error) continue;
    const phaseId = extractStepToPhaseId(step.id);
    if (phaseId) out[phaseId] = step.error;
  }
  return out;
}

export function phaseRunTone(
  serverStatus: PhaseStatus,
  runState?: PhaseRunState
): PhaseRunTone {
  if (runState === "running") return "active";
  if (runState === "failed") return "failed";
  if (runState === "done" || runState === "skipped") return "ready";

  if (serverStatus === "ready") return "ready";
  if (serverStatus === "visual_only") return "visual";
  if (serverStatus === "empty") return "empty";
  return "pending";
}

function shortenStepError(error: string): string {
  if (/rate_limit|429/.test(error)) {
    return "Anthropic rate limit (output tokens/min) — wait ~60s and run missing steps; server will auto-retry";
  }
  const oneLine = error.replace(/\s+/g, " ").trim();
  return oneLine.length > 160 ? `${oneLine.slice(0, 160)}…` : oneLine;
}

export function formatExtractFailureSummary(steps: FullExtractStep[]): string | null {
  const failed = steps.filter((s) => !s.ok && !s.skipped);
  if (!failed.length) return null;
  const labels = failed
    .slice(0, 4)
    .map(
      (s) =>
        `${extractStepToPhaseId(s.id) ?? s.id}: ${s.error ? shortenStepError(s.error) : "failed"}`
    );
  const extra = failed.length > 4 ? ` (+${failed.length - 4} more)` : "";
  return `${failed.length} step(s) failed — ${labels.join("; ")}${extra}`;
}
