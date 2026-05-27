"use client";

import { useEffect, useState } from "react";

function pdfViewerUrl(base: string, page: number): string {
  return `${base}#page=${page}&view=Fit&toolbar=1&navpanes=0`;
}

export function EpdPdfPane({
  pdfServeStem,
  pdfAvailable,
  pdfPage,
}: {
  pdfServeStem: string | null;
  pdfAvailable: boolean;
  pdfPage: number | null;
}) {
  const pdfBaseUrl = pdfServeStem ? `/pdf/${encodeURIComponent(pdfServeStem)}` : null;
  const pdfUrl =
    pdfAvailable && pdfBaseUrl && pdfPage != null ? pdfViewerUrl(pdfBaseUrl, pdfPage) : null;

  const [reachability, setReachability] = useState<"idle" | "checking" | "ok" | "missing">(
    "idle"
  );

  useEffect(() => {
    if (!pdfBaseUrl || !pdfAvailable) {
      setReachability(pdfAvailable ? "missing" : "missing");
      return;
    }

    let cancelled = false;
    setReachability("checking");

    fetch(pdfBaseUrl, { method: "HEAD" })
      .then((res) => {
        if (!cancelled) setReachability(res.ok ? "ok" : "missing");
      })
      .catch(() => {
        if (!cancelled) setReachability("missing");
      });

    return () => {
      cancelled = true;
    };
  }, [pdfBaseUrl, pdfAvailable]);

  if (!pdfAvailable || !pdfServeStem) {
    return (
      <div className="pdf-placeholder section-empty-state">
        <p>
          No PDF file in <code>data/EPD/</code> for this EPD.
        </p>
        <p className="hint">
          Add the signed PDF to <code>data/EPD/</code> (filename must match the extraction stem).
        </p>
      </div>
    );
  }

  if (pdfPage == null) {
    return (
      <div className="pdf-placeholder section-empty-state">
        <p>No page number in the document index for this section.</p>
        <p className="hint">
          <a href={pdfBaseUrl!} target="_blank" rel="noreferrer">
            Open full PDF
          </a>
        </p>
      </div>
    );
  }

  if (reachability === "checking" || reachability === "idle") {
    return (
      <div className="pdf-placeholder section-empty-state">
        <p className="hint">Loading PDF viewer…</p>
      </div>
    );
  }

  if (reachability === "missing") {
    return (
      <div className="pdf-placeholder section-empty-state">
        <p>
          PDF not found at <code className="mono-path">/pdf/{pdfServeStem}</code>.
        </p>
        <p className="hint">
          Expected file: <code className="mono-path">{pdfServeStem}.pdf</code> in{" "}
          <code>data/EPD/</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="epd-pdf-viewport">
      <iframe
        key={`pdf-${pdfServeStem}-${pdfPage}`}
        title={`EPD PDF page ${pdfPage}`}
        src={pdfUrl!}
        className="pdf-frame"
      />
    </div>
  );
}
