import Link from "next/link";
import { notFound } from "next/navigation";
import { EpdCompareWorkspace } from "@/app/components/EpdCompareWorkspace";
import { loadEpdRecord, loadGraphDocument, loadVerification } from "@/lib/data";
import { resolveEpdPhases } from "@/lib/phases/registry";

function JsonBlock({ data }: { data: unknown }) {
  return <pre className="code-block">{JSON.stringify(data, null, 2)}</pre>;
}

export default async function EpdPage({
  params,
}: {
  params: Promise<{ stem: string }>;
}) {
  const { stem: rawStem } = await params;
  const stem = decodeURIComponent(rawStem);
  const record = loadEpdRecord(stem);

  if (!record.phase1 && !record.phase2) {
    notFound();
  }

  const registry = resolveEpdPhases(stem);
  const graph = loadGraphDocument(stem);
  const verification = loadVerification(stem);
  const encoded = encodeURIComponent(stem);

  return (
    <div className="stack-lg">
      <p>
        <Link href="/">← All EPDs</Link>
      </p>

      <section>
        <h1>{record.phase2?.product_name ?? stem}</h1>
        <p className="epd-meta">
          {record.phase2?.epd_number ?? record.phase1?.epd_number} · {stem}
        </p>
        {registry.draft && verification ? (
          <p className="hint">
            Last AI verification: {new Date(verification.verifiedAt).toLocaleString()} (
            {verification.summary.match} match, {verification.summary.mismatch} mismatch)
          </p>
        ) : null}
        {!registry.draft ? (
          <p className="hint">
            No header draft yet — run <code>npm run drafts</code> after phase 2.
          </p>
        ) : null}
      </section>

      <EpdCompareWorkspace
        registry={registry}
        pdfAvailable={!!record.pdfPath}
        initialVerification={verification}
        showVerification={false}
      />

      <details className="panel dev-data-panel">
        <summary className="panel-head dev-data-summary">
          <h2>JSON-LD graph</h2>
          <span className="hint">Knowledge graph output</span>
        </summary>
        <div className="dev-data-body">
          <div className="panel-head">
            <span />
            <a href={`/api/graph/${encoded}`} target="_blank" rel="noreferrer">
              Raw JSON-LD
            </a>
          </div>
          {graph ? (
            <JsonBlock data={graph} />
          ) : (
            <p className="hint">
              Run <code>npm run graph</code> to build.
            </p>
          )}
        </div>
      </details>
    </div>
  );
}
