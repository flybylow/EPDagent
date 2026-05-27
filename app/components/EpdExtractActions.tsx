"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { consumeExtractProgressStream } from "@/lib/extract/consume-progress-stream";
import type { FullExtractResult } from "@/lib/extract/full-extract";
import type { ExtractProgressEvent } from "@/lib/extract/progress";
import type { ExtractRunSummary } from "@/lib/types";

type ExtractUiProgress = {
  stem: string;
  stepId: string;
  label: string;
  index: number;
  total: number;
};

export function EpdExtractActions({
  stem,
  hasPdf,
  extractSummary,
  layout = "inline",
}: {
  stem: string;
  hasPdf: boolean;
  extractSummary: ExtractRunSummary;
  layout?: "inline" | "toolbar";
}) {
  const router = useRouter();
  const [extracting, setExtracting] = useState(false);
  const [extractProgress, setExtractProgress] = useState<ExtractUiProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!hasPdf) return null;

  function handleProgressEvent(event: ExtractProgressEvent) {
    if (event.type === "start") {
      setExtractProgress({
        stem,
        stepId: event.stepId,
        label: event.label,
        index: event.index,
        total: event.total,
      });
    }
    if (event.type === "skip") {
      setExtractProgress({
        stem,
        stepId: event.stepId,
        label: `${event.label} (cached)`,
        index: event.index,
        total: event.total,
      });
    }
  }

  async function runExtract(force: boolean) {
    setExtracting(true);
    setExtractProgress(null);
    setError(null);

    try {
      const res = await fetch(`/api/extract/${encodeURIComponent(stem)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full: true, force, pendingOnly: !force, stream: true }),
      });

      const contentType = res.headers.get("content-type") ?? "";

      if (contentType.includes("application/x-ndjson")) {
        const { result, error: streamError, httpStatus } = await consumeExtractProgressStream(
          res,
          handleProgressEvent
        );
        if (streamError) throw new Error(streamError);
        if (!result) throw new Error("Extraction finished without a result");
        if (!res.ok && httpStatus !== 207) throw new Error("Extraction failed");
        router.refresh();
        return;
      }

      const raw = await res.text();
      if (!contentType.includes("application/json")) {
        throw new Error(
          res.ok
            ? "Server returned non-JSON response"
            : `Extraction failed (${res.status}): ${raw.slice(0, 200).replace(/\s+/g, " ")}`
        );
      }
      const data = JSON.parse(raw) as FullExtractResult & { error?: string; warning?: string };
      if (!res.ok && res.status !== 207) {
        throw new Error(data.error ?? data.warning ?? "Extraction failed");
      }
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setExtracting(false);
      setExtractProgress(null);
    }
  }

  const wrapClass =
    layout === "toolbar" ? "epd-extract-toolbar" : "epd-extract-actions";

  return (
    <div className={wrapClass}>
      {error ? <p className="verify-error">{error}</p> : null}
      <button
        type="button"
        className={`btn${extracting ? " btn-extracting" : ""}`}
        disabled={extracting || extractSummary.upToDate}
        title={
          extractSummary.upToDate
            ? "All pipeline steps are cached"
            : extractSummary.pendingStepLabels.join("\n")
        }
        onClick={() => runExtract(false)}
      >
        {extracting ? (
          <>
            <span className="btn-extract-title">Extracting…</span>
            {extractProgress ? (
              <span className="btn-extract-phase">
                {extractProgress.index}/{extractProgress.total} · {extractProgress.label}
              </span>
            ) : (
              <span className="btn-extract-phase">Preparing pipeline…</span>
            )}
          </>
        ) : extractSummary.upToDate ? (
          "All steps complete"
        ) : (
          `Run ${extractSummary.pendingCount} missing step${
            extractSummary.pendingCount === 1 ? "" : "s"
          }`
        )}
      </button>
      {!extractSummary.upToDate ? (
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
  );
}
