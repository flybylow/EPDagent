import type { PipelinePhaseSummary } from "../types";

export interface PipelineCoverageSummary {
  total: number;
  ready: number;
  pending: number;
  empty: number;
  visualOnly: number;
}

/** Dashboard phase lights — one row per extract phase (files on disk). */
export function pipelineCoverageSummary(
  phases: PipelinePhaseSummary[]
): PipelineCoverageSummary {
  let ready = 0;
  let pending = 0;
  let empty = 0;
  let visualOnly = 0;
  for (const phase of phases) {
    if (phase.status === "ready") ready += 1;
    else if (phase.status === "pending") pending += 1;
    else if (phase.status === "empty") empty += 1;
    else if (phase.status === "visual_only") visualOnly += 1;
  }
  return {
    total: phases.length,
    ready,
    pending,
    empty,
    visualOnly,
  };
}
