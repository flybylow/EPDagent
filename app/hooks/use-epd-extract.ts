"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { formatChunkStallMessage } from "@/lib/extract/chunk-stall";
import {
  EXTRACT_CHUNK_MAX_ROUNDS,
  EXTRACT_CHUNK_MAX_STALE_ROUNDS,
  EXTRACT_CHUNK_MAX_TIMEOUT_ROUNDS,
  EXTRACT_CHUNK_SIZE,
} from "@/lib/extract/chunked-extract";
import { consumeExtractProgressStream } from "@/lib/extract/consume-progress-stream";
import { fetchExtractStatus } from "@/lib/extract/fetch-extract-status";
import type { FullExtractResult, FullExtractStep } from "@/lib/extract/full-extract";
import {
  formatExtractFailureSummary,
  phaseRunStatesFromSteps,
  stepErrorsFromSteps,
  type PhaseRunState,
} from "@/lib/extract/phase-run-state";
import { extractStepToPhaseId } from "@/lib/extract/step-phase-map";
import type { ExtractProgressEvent } from "@/lib/extract/progress";
import type { ExtractRunSummary } from "@/lib/types";

function mergeSteps(
  into: Map<string, FullExtractStep>,
  steps: FullExtractStep[]
): void {
  for (const step of steps) {
    into.set(step.id, step);
  }
}

export function useEpdExtract(stem: string, extractSummary: ExtractRunSummary) {
  const router = useRouter();
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [progressLabel, setProgressLabel] = useState<string | null>(null);
  const [progressIndex, setProgressIndex] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);
  const [phaseRunStates, setPhaseRunStates] = useState<Record<string, PhaseRunState>>({});
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});
  const [lastResult, setLastResult] = useState<FullExtractResult | null>(null);

  const sessionTotalRef = useRef(0);
  const sessionDoneRef = useRef(0);

  const bumpSessionProgress = useCallback((label: string) => {
    sessionDoneRef.current = Math.min(
      sessionTotalRef.current,
      sessionDoneRef.current + 1
    );
    setProgressIndex(sessionDoneRef.current);
    setProgressTotal(sessionTotalRef.current);
    setProgressLabel(label);
  }, []);

  const applyProgress = useCallback(
    (event: ExtractProgressEvent) => {
      const phaseId =
        event.type === "start" ||
        event.type === "skip" ||
        event.type === "done"
          ? extractStepToPhaseId(event.stepId)
          : null;

      if (event.type === "plan") {
        if (sessionTotalRef.current === 0) {
          sessionTotalRef.current = event.steps.length;
          setProgressTotal(event.steps.length);
        }
      }

      if (event.type === "start") {
        setProgressLabel(event.label);
        setProgressIndex(
          sessionTotalRef.current > 0
            ? sessionDoneRef.current + 1
            : event.index
        );
        if (sessionTotalRef.current === 0) {
          setProgressTotal(event.total);
        }
        if (phaseId) {
          setPhaseRunStates((prev) => ({ ...prev, [phaseId]: "running" }));
        }
      }

      if (event.type === "skip") {
        bumpSessionProgress(`${event.label} (cached)`);
        if (phaseId) {
          setPhaseRunStates((prev) => ({ ...prev, [phaseId]: "skipped" }));
        }
        if (event.stepId === "docmap") {
          router.refresh();
        }
      }

      if (event.type === "done") {
        bumpSessionProgress(event.label);
        if (phaseId) {
          const state: PhaseRunState =
            event.skipped ? "skipped" : event.ok ? "done" : "failed";
          setPhaseRunStates((prev) => ({ ...prev, [phaseId]: state }));
          if (!event.ok && !event.skipped && event.error) {
            setStepErrors((prev) => ({ ...prev, [phaseId]: event.error! }));
          }
        }
        if (event.stepId === "docmap" && event.ok) {
          router.refresh();
        }
      }
    },
    [bumpSessionProgress, router]
  );

  const finishFromResult = useCallback(
    (
      result: FullExtractResult | null,
      streamError: string | null,
      timeoutNote: string | null
    ) => {
      if (result) {
        setLastResult(result);
        setPhaseRunStates(phaseRunStatesFromSteps(result.steps));
        setStepErrors(stepErrorsFromSteps(result.steps));
        const summary = formatExtractFailureSummary(result.steps);
        const parts = [timeoutNote, summary].filter(Boolean);
        setWarning(parts.length ? parts.join(" · ") : null);
        setError(streamError);
        router.refresh();
        return;
      }
      if (streamError || timeoutNote) {
        setWarning(timeoutNote);
        setError(streamError);
        router.refresh();
      }
    },
    [router]
  );

  const runExtract = useCallback(
    async (force: boolean) => {
      setExtracting(true);
      setError(null);
      setWarning(null);
      setProgressLabel(null);
      setProgressIndex(0);
      setProgressTotal(0);
      setPhaseRunStates({});
      setStepErrors({});
      setLastResult(null);

      sessionTotalRef.current = force ? 0 : extractSummary.pendingCount;
      sessionDoneRef.current = 0;
      if (!force && extractSummary.pendingCount > 0) {
        setProgressTotal(extractSummary.pendingCount);
      }

      const mergedSteps = new Map<string, FullExtractStep>();
      let lastChunkResult: FullExtractResult | null = null;
      let streamError: string | null = null;
      let timeoutNote: string | null = null;
      let staleRounds = 0;
      let timeoutRounds = 0;
      let lastPending = -1;
      let lastPendingLabels: string[] = [];

      try {
        for (let round = 0; round < EXTRACT_CHUNK_MAX_ROUNDS; round += 1) {
          const statusBefore =
            round === 0 && !force
              ? null
              : await fetchExtractStatus(stem).catch(() => null);

          if (statusBefore?.upToDate) {
            break;
          }

          const res = await fetch(`/api/extract/${encodeURIComponent(stem)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              full: true,
              force,
              pendingOnly: !force,
              stream: true,
              maxSteps: EXTRACT_CHUNK_SIZE,
            }),
          });

          const contentType = res.headers.get("content-type") ?? "";

          if (!contentType.includes("application/x-ndjson")) {
            const raw = await res.text();
            if (!contentType.includes("application/json")) {
              throw new Error(
                res.ok
                  ? "Server returned non-JSON response"
                  : `Extraction failed (${res.status}): ${raw.slice(0, 200).replace(/\s+/g, " ")}`
              );
            }
            const data = JSON.parse(raw) as FullExtractResult & { error?: string };
            if (!res.ok && res.status !== 207) {
              throw new Error(data.error ?? "Extraction failed");
            }
            mergeSteps(mergedSteps, data.steps);
            lastChunkResult = data;
            break;
          }

          const { result, error: chunkError, incomplete, httpStatus } =
            await consumeExtractProgressStream(res, applyProgress);

          if (chunkError) {
            streamError = chunkError;
          }

          const chunkIncomplete = incomplete && !result;

          if (chunkIncomplete) {
            timeoutNote =
              "Some steps may have timed out; the run continued automatically.";
            timeoutRounds += 1;
          } else {
            timeoutRounds = 0;
          }

          if (result) {
            mergeSteps(mergedSteps, result.steps);
            lastChunkResult = result;
            streamError = chunkError;

            const failedSummary = formatExtractFailureSummary(result.steps);
            if (failedSummary) {
              throw new Error(failedSummary);
            }
          }

          if (!res.ok && httpStatus !== 207 && !result && !incomplete) {
            throw new Error("Extraction failed");
          }

          const statusAfter = await fetchExtractStatus(stem);
          lastPendingLabels = statusAfter.pendingStepLabels;

          if (sessionTotalRef.current === 0 && statusAfter.totalSteps > 0) {
            sessionTotalRef.current = force
              ? statusAfter.pendingCount + mergedSteps.size
              : extractSummary.pendingCount || statusAfter.pendingCount;
            setProgressTotal(sessionTotalRef.current);
          }

          sessionDoneRef.current = Math.max(
            sessionDoneRef.current,
            sessionTotalRef.current > 0
              ? sessionTotalRef.current - statusAfter.pendingCount
              : mergedSteps.size
          );
          setProgressIndex(sessionDoneRef.current);

          if (statusAfter.upToDate) {
            break;
          }

          if (result && !result.stoppedEarly && result.pendingAfter === 0) {
            break;
          }

          if (!chunkIncomplete) {
            if (statusAfter.pendingCount === lastPending) {
              staleRounds += 1;
            } else {
              staleRounds = 0;
            }
          }
          lastPending = statusAfter.pendingCount;

          if (timeoutRounds >= EXTRACT_CHUNK_MAX_TIMEOUT_ROUNDS) {
            throw new Error(
              formatChunkStallMessage(
                lastPendingLabels,
                [...mergedSteps.values()]
              )
            );
          }

          if (staleRounds >= EXTRACT_CHUNK_MAX_STALE_ROUNDS) {
            throw new Error(
              formatChunkStallMessage(lastPendingLabels, [...mergedSteps.values()])
            );
          }

          if (!result && !chunkIncomplete && chunkError) {
            throw new Error(chunkError);
          }
        }

        let finalResult: FullExtractResult | null = null;
        if (lastChunkResult || mergedSteps.size > 0) {
          finalResult = {
            stem: lastChunkResult?.stem ?? stem,
            pdfPath: lastChunkResult?.pdfPath ?? "",
            steps: [...mergedSteps.values()],
            coverage: lastChunkResult?.coverage ?? {
              ready: 0,
              visual_only: 0,
              pending: 0,
              withPdf: 0,
            },
            pendingSections: lastChunkResult?.pendingSections ?? [],
            pendingAfter: 0,
            stoppedEarly: false,
          };
        }

        const statusFinal = await fetchExtractStatus(stem).catch(() => null);
        if (finalResult && statusFinal) {
          finalResult.pendingAfter = statusFinal.pendingCount;
          finalResult.stoppedEarly = statusFinal.pendingCount > 0;
        }

        finishFromResult(finalResult, streamError, timeoutNote);

        if (statusFinal?.upToDate) {
          setError(null);
          setWarning((prev) => {
            const doneMsg = "All pipeline steps are now cached.";
            if (timeoutNote && prev) return `${timeoutNote} ${doneMsg} ${prev}`;
            if (timeoutNote) return `${timeoutNote} ${doneMsg}`;
            if (prev) return prev;
            return null;
          });
        } else if (statusFinal && statusFinal.pendingCount > 0) {
          setWarning(
            (prev) =>
              prev ??
              `${statusFinal.pendingCount} step(s) still pending — click Run missing steps to continue.`
          );
        }
      } catch (err) {
        setError((err as Error).message);
        router.refresh();
      } finally {
        setExtracting(false);
        setProgressLabel(null);
      }
    },
    [applyProgress, extractSummary.pendingCount, finishFromResult, stem]
  );

  const needsExtract = !extractSummary.upToDate;

  return {
    extracting,
    error,
    warning,
    progressLabel,
    progressIndex,
    progressTotal,
    phaseRunStates,
    stepErrors,
    lastResult,
    needsExtract,
    runExtract,
  };
}
