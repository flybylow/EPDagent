"use client";

import { useState } from "react";
import type { DraftDocument, FieldVerification, VerificationResult } from "@/lib/templates/types";
import type { TableExportManifest } from "@/lib/tables/types";
import { DraftDocumentView } from "@/app/components/DraftDocumentView";
import { TableComparePanel } from "./TableComparePanel";

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
      const data = await res.json();
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
          <code>ANTHROPIC_API_KEY</code> and <code>pdfs/{stem}.pdf</code> for full checks.
        </p>
      )}
    </section>
  );
}

export function VerifyWorkspace({
  stem,
  draft,
  pdfAvailable,
  initialVerification,
  tableExports,
}: {
  stem: string;
  draft: DraftDocument;
  pdfAvailable: boolean;
  initialVerification: VerificationResult | null;
  tableExports: TableExportManifest | null;
}) {
  const pdfUrl = `/api/pdf/${encodeURIComponent(stem)}`;

  return (
    <div className="verify-workspace">
      <div className="verify-columns">
        <section className="panel verify-source">
          <div className="panel-head">
            <h2>Original PDF</h2>
            {pdfAvailable ? (
              <a href={pdfUrl} target="_blank" rel="noreferrer">
                Open
              </a>
            ) : null}
          </div>
          {pdfAvailable ? (
            <iframe title="EPD PDF" src={pdfUrl} className="pdf-frame" />
          ) : (
            <div className="pdf-placeholder">
              <p>No PDF in <code>data/EPD/</code> for this stem.</p>
              <p className="hint">Draft template still renders from phase JSON.</p>
            </div>
          )}
        </section>

        <section className="panel verify-draft">
          <div className="panel-head">
            <h2>Formatted draft</h2>
            <a href={`/api/drafts/${encodeURIComponent(stem)}`} target="_blank" rel="noreferrer">
              draft.json
            </a>
          </div>
          <DraftDocumentView draft={draft} />
        </section>
      </div>

      {tableExports ? <TableComparePanel manifest={tableExports} /> : null}

      <VerificationPanel initial={initialVerification} stem={stem} />
    </div>
  );
}
