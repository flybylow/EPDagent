"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import type { GapReport, GapRow } from "@/lib/extract/gap-report";
import { GAP_REASON_LABELS, gapSuggestedAction } from "@/lib/extract/gap-actions";
import type { GapReason } from "@/lib/extract/gap-report";
import {
  gapRunDisabledReason,
  gapRunShouldForce,
  gapRunStepLabel,
  resolveGapExtractStepId,
} from "@/lib/extract/gap-run-step";

const REASON_ORDER: GapReason[] = [
  "no_mapping",
  "pipeline_pending",
  "phase3_extract",
  "phase4_probe",
  "phase7_narrative",
  "phase5_scenarios",
  "phase6_refs",
  "phase2_header",
  "phase_empty",
  "unknown",
];

function groupOpenGaps(gaps: GapRow[]): Map<GapReason, GapRow[]> {
  const map = new Map<GapReason, GapRow[]>();
  for (const g of gaps.filter((x) => x.lockStatus === "open")) {
    const list = map.get(g.gapReason) ?? [];
    list.push(g);
    map.set(g.gapReason, list);
  }
  return map;
}

export function EpdGapPanel({
  stem,
  initialReport,
  onJumpToSection,
  onGapsOnlyChange,
  onReportUpdate,
}: {
  stem: string;
  initialReport: GapReport | null;
  onJumpToSection: (sectionId: string) => void;
  onGapsOnlyChange?: (on: boolean) => void;
  onReportUpdate?: (report: GapReport) => void;
}) {
  const router = useRouter();
  const [report, setReport] = useState(initialReport);
  const [open, setOpen] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [runningStep, setRunningStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const openGaps = report?.gaps.filter((g) => g.lockStatus === "open") ?? [];
  const grouped = useMemo(() => groupOpenGaps(report?.gaps ?? []), [report]);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/gaps/${encodeURIComponent(stem)}`);
    const data = (await res.json()) as GapReport & { error?: string };
    if (!res.ok) throw new Error(data.error ?? "Failed to refresh gaps");
    setReport(data);
    onReportUpdate?.(data);
  }, [stem, onReportUpdate]);

  async function runStep(g: GapRow) {
    const stepId = resolveGapExtractStepId(g);
    const disabled = gapRunDisabledReason(g, stepId);
    if (!stepId || disabled) {
      setError(disabled ?? "No extract step for this gap");
      return;
    }

    setBusyId(g.sectionId);
    setRunningStep(stepId);
    setError(null);
    try {
      const res = await fetch(
        `/api/extract/step/${encodeURIComponent(stem)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stepId,
            force: gapRunShouldForce(g),
          }),
        }
      );
      const data = (await res.json()) as GapReport & {
        error?: string;
        gapReport?: GapReport;
      };
      if (!res.ok) throw new Error(data.error ?? "Extract step failed");
      const next = data.gapReport ?? data;
      if (next.summary) {
        setReport(next);
        onReportUpdate?.(next);
      } else {
        await refresh();
      }
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
      setRunningStep(null);
    }
  }

  async function setLock(
    sectionId: string,
    status: "accepted" | "fixed" | "open",
    note?: string
  ) {
    setBusyId(sectionId);
    setError(null);
    try {
      const res = await fetch(`/api/gaps/${encodeURIComponent(stem)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId, status, note }),
      });
      const data = (await res.json()) as GapReport & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Lock failed");
      setReport(data);
      onReportUpdate?.(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  if (!report || report.summary.open === 0) {
    if (report && report.summary.accepted > 0) {
      return (
        <p className="epd-gap-panel epd-gap-panel-done hint">
          No open gaps · {report.summary.accepted} accepted ·{" "}
          {report.summary.fixed} fixed
        </p>
      );
    }
    return null;
  }

  return (
    <section className="panel epd-gap-panel" aria-label="Section gaps">
      <div className="epd-gap-panel-head">
        <button
          type="button"
          className="epd-gap-panel-toggle"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <strong>{report.summary.open} open gaps</strong>
          <span className="hint">
            {report.summary.gaps} total · {report.summary.accepted} accepted ·{" "}
            {report.summary.fixed} fixed
          </span>
        </button>
        <div className="epd-gap-panel-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              onGapsOnlyChange?.(true);
              if (openGaps[0]) onJumpToSection(openGaps[0].sectionId);
            }}
          >
            Show in nav
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => refresh()}>
            Refresh
          </button>
        </div>
      </div>

      {error ? <p className="verify-error">{error}</p> : null}

      {open ? (
        <div className="epd-gap-panel-body">
          {REASON_ORDER.map((reason) => {
            const rows = grouped.get(reason);
            if (!rows?.length) return null;
            return (
              <div key={reason} className="epd-gap-group">
                <h3 className="epd-gap-group-title">
                  {GAP_REASON_LABELS[reason]}{" "}
                  <span className="epd-gap-group-count">({rows.length})</span>
                </h3>
                <p className="hint epd-gap-group-hint">{gapSuggestedAction(reason)}</p>
                <ul className="epd-gap-list">
                  {rows.map((g) => {
                    const stepId = resolveGapExtractStepId(g);
                    const runDisabled = gapRunDisabledReason(g, stepId);
                    const runLabel = stepId ? gapRunStepLabel(stepId) : "Run";
                    const isRunning =
                      busyId === g.sectionId && runningStep != null;

                    return (
                    <li key={g.sectionId} className="epd-gap-row">
                      <div className="epd-gap-row-main">
                        <button
                          type="button"
                          className="epd-gap-row-jump"
                          onClick={() => onJumpToSection(g.sectionId)}
                        >
                          <span className="epd-gap-row-num">
                            {g.number !== "—" ? `§${g.number}` : "—"}
                          </span>
                          {g.page != null ? (
                            <span className="epd-gap-row-page">p{g.page}</span>
                          ) : null}
                          <span className="epd-gap-row-title">{g.title}</span>
                        </button>
                        {g.pendingMessage ? (
                          <p className="epd-gap-row-msg">{g.pendingMessage}</p>
                        ) : null}
                      </div>
                      <div className="epd-gap-row-btns">
                        {stepId ? (
                          <button
                            type="button"
                            className="btn btn-primary epd-gap-run-btn"
                            disabled={busyId === g.sectionId || !!runDisabled}
                            title={
                              runDisabled ??
                              (gapRunShouldForce(g)
                                ? "Re-run extract (force)"
                                : undefined)
                            }
                            onClick={() => runStep(g)}
                          >
                            {isRunning ? "Running…" : runLabel}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="btn btn-ghost"
                          disabled={busyId === g.sectionId}
                          onClick={() => onJumpToSection(g.sectionId)}
                        >
                          Open
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          disabled={busyId === g.sectionId}
                          title="Known limitation — hide from open gap count"
                          onClick={() =>
                            setLock(
                              g.sectionId,
                              "accepted",
                              "Accepted via gap panel"
                            )
                          }
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          disabled={busyId === g.sectionId}
                          title="Fixed and verified"
                          onClick={() =>
                            setLock(g.sectionId, "fixed", "Fixed via gap panel")
                          }
                        >
                          Fixed
                        </button>
                      </div>
                    </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
