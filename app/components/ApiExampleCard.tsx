"use client";

import { useCallback, useState } from "react";

export function ApiExampleCard({
  title,
  description,
  method,
  path,
  curl,
  status,
  response,
}: {
  title: string;
  description: string;
  method: string;
  path: string;
  curl: string;
  status: number;
  response: unknown;
}) {
  const [copied, setCopied] = useState(false);

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(curl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [curl]);

  return (
    <section className="panel api-example-card">
      <header className="api-example-head">
        <div>
          <h2>{title}</h2>
          <p className="hint">{description}</p>
        </div>
        <span className={`api-status api-status-${status >= 400 ? "err" : "ok"}`}>
          {status}
        </span>
      </header>

      <p className="api-route">
        <code className="api-method">{method}</code> <code>{path}</code>
      </p>

      <div className="api-curl-row">
        <pre className="api-curl">{curl}</pre>
        <button type="button" className="btn btn-inline" onClick={onCopy}>
          {copied ? "Copied" : "Copy curl"}
        </button>
      </div>

      <p className="hint api-response-label">Response (live from this deployment)</p>
      <pre className="code-block">{JSON.stringify(response, null, 2)}</pre>
    </section>
  );
}
