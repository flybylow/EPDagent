"use client";

import { useState } from "react";
import type { FieldVerification, VerificationResult } from "@/lib/templates/types";
import type { EpdPhaseRegistry } from "@/lib/phases/registry";
import type { GapReport } from "@/lib/extract/gap-report";
import type { ExtractRunSummary, PipelinePhaseSummary } from "@/lib/types";
import { EpdDetailWorkspace } from "@/app/components/EpdDetailWorkspace";

function statusClass(status: FieldVerification["status"]): string {
  switch (status) {
    case "match":
      return "verify-match";
    case "mismatch":
      return "verify-mismatch";
    case "unclear":
      return "verify-unclear";
    default:
      return "verify-missing";
  }
}

function VerificationPanel({
  initial,
  stem,
}: {
  initial: VerificationResult | null;
  stem: string;
}) {
  const [result, setResult] = useState<VerificationResult | null>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runVerify() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/verify/${encodeURIComponent(stem)}`, { method: "POST" });
      const contentType = res.headers.get("content-type") ?? "";
      const raw = await res.text();
      if (!contentType.includes("application/json")) {
        throw new Error(
          res.ok
            ? "Server returned non-JSON response"
            : `Verification failed (${res.status}): ${raw.slice(0, 200).replace(/\s+/g, " ")}`
        );
      }
      const data = JSON.parse(raw) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Verification failed");
      setResult(data as VerificationResult);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel verify-panel">
      <div className="panel-head">
        <h2>AI verification</h2>
        <button type="button" className="btn" onClick={runVerify} disabled={loading}>
          {loading ? "Verifying…" : result ? "Re-run verification" : "Verify draft vs PDF"}
        </button>
      </div>

      {error ? <p className="verify-error">{error}</p> : null}

      {result ? (
        <div className="stack-md">
          <div className="verify-summary">
            <span className="verify-match">{result.summary.match} match</span>
            <span className="verify-mismatch">{result.summary.mismatch} mismatch</span>
            <span className="verify-unclear">{result.summary.unclear} unclear</span>
            <span className="verify-missing">{result.summary.missing} missing</span>
            {!result.pdfAvailable ? (
              <span className="hint"> · no PDF on disk</span>
            ) : null}
          </div>
          {result.overallNote ? <p className="hint">{result.overallNote}</p> : null}
          <ul className="verify-list">
            {result.fields.map((field) => (
              <li key={field.fieldId} className={`verify-row ${statusClass(field.status)}`}>
                <div className="verify-row-head">
                  <strong>{field.label}</strong>
                  <span className="verify-status">{field.status.replaceAll("_", " ")}</span>
                </div>
                <div className="verify-row-values">
                  <span>Draft: {field.draftValue ?? "—"}</span>
                  {field.pdfValue ? <span>PDF: {field.pdfValue}</span> : null}
                </div>
                {field.note ? <p className="verify-note">{field.note}</p> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="hint">
          Compares each templated draft field against the source PDF using Claude. Requires{" "}
          <code>ANTHROPIC_API_KEY</code> and a PDF in <code>data/EPD/</code> for full checks.
        </p>
      )}
    </section>
  );
}

export function EpdCompareWorkspace({
  registry,
  pdfAvailable,
  pdfServeStem,
  extractSummary,
  pipelinePhases = [],
  hasDocmapIndex = true,
  initialVerification,
  showVerification = true,
  gapReport = null,
  initialGapsOnly = false,
  extractEnabled = true,
}: {
  registry: EpdPhaseRegistry;
  pdfAvailable: boolean;
  pdfServeStem: string | null;
  extractSummary?: ExtractRunSummary | null;
  pipelinePhases?: PipelinePhaseSummary[];
  hasDocmapIndex?: boolean;
  initialVerification: VerificationResult | null;
  showVerification?: boolean;
  gapReport?: GapReport | null;
  initialGapsOnly?: boolean;
  extractEnabled?: boolean;
}) {
  return (
    <div className="verify-workspace">
      <EpdDetailWorkspace
        registry={registry}
        pdfAvailable={pdfAvailable}
        pdfServeStem={pdfServeStem}
        extractSummary={extractSummary}
        pipelinePhases={pipelinePhases}
        hasDocmapIndex={hasDocmapIndex}
        gapReport={gapReport}
        initialGapsOnly={initialGapsOnly}
        extractEnabled={extractEnabled}
      />

      {showVerification && registry.draft ? (
        <VerificationPanel initial={initialVerification} stem={registry.stem} />
      ) : null}
    </div>
  );
}
