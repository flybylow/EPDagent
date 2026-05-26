"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { EpdRecord } from "@/lib/types";

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`badge ${ok ? "badge-ok" : "badge-missing"}`} title={label}>
      {label}
    </span>
  );
}

function SourceTag({ record }: { record: EpdRecord }) {
  if (record.referenceId) {
    return (
      <span className="source-tag source-reference" title={record.referenceLabel ?? undefined}>
        reference{record.referenceId === "etex-natura-ea" ? " · compare here" : ""}
      </span>
    );
  }
  if (record.hasPdf && !record.isDemoFixture && record.phase1) {
    return <span className="source-tag source-extracted">extracted</span>;
  }
  if (record.hasPdf && record.needsExtraction) {
    return <span className="source-tag source-pdf">PDF only</span>;
  }
  if (record.isDemoFixture) {
    return <span className="source-tag source-demo">demo data</span>;
  }
  if (record.hasPdf) {
    return <span className="source-tag source-pdf">PDF</span>;
  }
  return <span className="source-tag source-orphan">no PDF</span>;
}

export function EpdCorpusList({
  records,
  pdfFolderPath,
  pdfCount,
  pdfFolderIsDefault,
}: {
  records: EpdRecord[];
  pdfFolderPath: string;
  pdfCount: number;
  pdfFolderIsDefault: boolean;
}) {
  const router = useRouter();
  const [extracting, setExtracting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function extractStem(stem: string) {
    setExtracting(stem);
    setError(null);
    try {
      const res = await fetch(`/api/extract/${encodeURIComponent(stem)}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Extraction failed");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setExtracting(null);
    }
  }

  return (
    <div className="stack-md">
      <section className="panel pdf-folder-panel">
        <div className="panel-head">
          <h2>EPD PDF folder</h2>
          <span className="hint">{pdfCount} PDF{pdfCount === 1 ? "" : "s"}</span>
        </div>
        <p className="hint mono-path">{pdfFolderPath}</p>
        {pdfFolderIsDefault ? (
          <p className="hint">
            Using project folder <code>data/EPD/</code> — your EPD PDFs live here by default.
          </p>
        ) : (
          <p className="hint">
            Using <code>EPDAGENT_PDF_DIR</code> from <code>.env</code>.
          </p>
        )}
        {pdfCount === 0 ? (
          <p className="hint">
            Folder is empty right now. Add <code>*.pdf</code> files, refresh, then click{" "}
            <strong>Extract PDF</strong>.
          </p>
        ) : null}
      </section>

      {error ? <p className="verify-error">{error}</p> : null}

      {records.length === 0 ? (
        <div className="empty-state">
          <p>No PDFs in the folder yet.</p>
          <pre className="code-block">{`${pdfFolderPath}\n# drop EPD *.pdf files here, then refresh`}</pre>
        </div>
      ) : (
        <ul className="epd-list">
          {records.map((record) => (
            <li key={record.stem} className="epd-card">
              <div className="epd-card-main">
                <Link href={`/epd/${encodeURIComponent(record.stem)}`} className="epd-title">
                  {record.phase2?.product_name ?? record.phase1?.epd_number ?? record.stem}
                </Link>
                <p className="epd-meta">
                  {record.phase2?.epd_number ?? record.phase1?.epd_number ?? record.stem}
                  {record.phase1?.language ? ` · ${record.phase1.language}` : ""}
                  {record.pdfFilename ? ` · ${record.pdfFilename}` : ""}
                </p>
                <SourceTag record={record} />
              </div>
              <div className="epd-badges">
                <StatusBadge ok={record.hasPdf} label="PDF" />
                <StatusBadge ok={!!record.phase1} label="P1" />
                <StatusBadge ok={!!record.phase2} label="P2" />
                <StatusBadge ok={!!record.draftPath} label="Draft" />
                <StatusBadge ok={!!record.graphPath} label="KG" />
              </div>
              <div className="epd-actions">
                {record.hasPdf ? (
                  <button
                    type="button"
                    className="btn"
                    disabled={extracting === record.stem}
                    onClick={() => extractStem(record.stem)}
                  >
                    {extracting === record.stem
                      ? "Extracting…"
                      : record.needsExtraction
                        ? "Extract PDF"
                        : "Re-extract PDF"}
                  </button>
                ) : null}
                {record.draftPath ? (
                  <Link
                    href={`/epd/${encodeURIComponent(record.stem)}/verify`}
                    className="epd-verify-link"
                  >
                    Verify
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
