"use client";

import { EpdPhaseLights } from "@/app/components/EpdPhaseLights";
import { useEpdExtract } from "@/app/hooks/use-epd-extract";
import type { ExtractRunSummary, PipelinePhaseSummary } from "@/lib/types";

export function EpdExtractToolbar({
  stem,
  hasPdf,
  extractSummary,
  pipelinePhases,
  showPhases = true,
  layout = "inline",
}: {
  stem: string;
  hasPdf: boolean;
  extractSummary: ExtractRunSummary;
  pipelinePhases: PipelinePhaseSummary[];
  showPhases?: boolean;
  layout?: "inline" | "toolbar" | "stacked";
}) {
  const {
    extracting,
    error,
    warning,
    progressLabel,
    progressIndex,
    progressTotal,
    phaseRunStates,
    stepErrors,
    needsExtract,
    runExtract,
  } = useEpdExtract(stem, extractSummary);

  if (!hasPdf) return null;

  const wrapClass =
    layout === "toolbar"
      ? "epd-extract-toolbar"
      : layout === "stacked"
        ? "epd-extract-stack"
        : "epd-extract-actions";

  const showRunStates = extracting || Object.keys(phaseRunStates).length > 0;

  return (
    <div className={wrapClass}>
      <div className="epd-extract-row">
        {error && !extracting ? (
          <p className="epd-extract-feedback is-error">{error}</p>
        ) : null}
        {warning && !extracting && !error ? (
          <p className="epd-extract-feedback is-warning">{warning}</p>
        ) : null}
        {warning && !extracting && error ? (
          <p className="epd-extract-feedback is-warning">{warning}</p>
        ) : null}
        <button
          type="button"
          className={`btn${extracting ? " btn-extracting" : ""}`}
          disabled={extracting || !needsExtract}
          title={
            needsExtract
              ? extractSummary.pendingStepLabels.join("\n")
              : "All pipeline steps are cached"
          }
          onClick={() => runExtract(false)}
        >
          {extracting ? (
            <>
              <span className="btn-extract-title">Extracting…</span>
              {progressLabel ? (
                <span className="btn-extract-phase">
                  {progressIndex}/{progressTotal} · {progressLabel}
                </span>
              ) : (
                <span className="btn-extract-phase">Preparing…</span>
              )}
            </>
          ) : needsExtract ? (
            `Run ${extractSummary.pendingCount} missing step${
              extractSummary.pendingCount === 1 ? "" : "s"
            }`
          ) : (
            "All steps complete"
          )}
        </button>
        {needsExtract ? (
          <button
            type="button"
            className="btn btn-inline"
            disabled={extracting}
            title="Ignore caches and re-run every step"
            onClick={() => {
              if (
                window.confirm(
                  "Re-extract all steps? This ignores caches and uses more API tokens."
                )
              ) {
                runExtract(true);
              }
            }}
          >
            Re-extract all
          </button>
        ) : null}
      </div>
      {showPhases && pipelinePhases.length > 0 ? (
        <EpdPhaseLights
          phases={pipelinePhases}
          phaseRunStates={showRunStates ? phaseRunStates : undefined}
          stepErrors={showRunStates ? stepErrors : undefined}
        />
      ) : null}
    </div>
  );
}
