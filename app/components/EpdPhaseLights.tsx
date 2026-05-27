import { phaseRunTone, type PhaseRunState } from "@/lib/extract/phase-run-state";
import type { PhaseStatus } from "@/lib/phases/registry";
import type { PipelinePhaseSummary } from "@/lib/types";

export function EpdPhaseLights({
  phases,
  phaseRunStates,
  stepErrors,
}: {
  phases: PipelinePhaseSummary[];
  /** Live run state per pipeline phase (during/after extract). */
  phaseRunStates?: Record<string, PhaseRunState>;
  stepErrors?: Record<string, string>;
}) {
  if (!phases.length) return null;

  const hasRunState = phaseRunStates && Object.keys(phaseRunStates).length > 0;

  return (
    <div className="epd-phase-lights" aria-label="Pipeline phases">
      {phases.map((phase) => {
        const runState = phaseRunStates?.[phase.id];
        const tone = phaseRunTone(phase.status, hasRunState ? runState : undefined);
        const err = stepErrors?.[phase.id];
        let title = phase.name;
        if (err) title += ` — ${err}`;
        else if (runState === "running") title += " — running";
        else if (runState === "failed") title += " — failed this run";
        else if (tone === "empty") title += " — no output yet";
        else if (tone === "pending") title += " — not extracted";
        else if (tone === "ready") title += " — ready";
        else if (tone === "visual") title += " — visual only";

        return (
          <span
            key={phase.id}
            className={`epd-phase-light is-${tone}${runState === "running" ? " is-active" : ""}`}
            title={title}
          >
            <span className="epd-phase-light-label">{phase.shortLabel}</span>
          </span>
        );
      })}
    </div>
  );
}
