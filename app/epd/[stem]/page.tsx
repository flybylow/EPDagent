import Link from "next/link";
import { notFound } from "next/navigation";
import { DraftDocumentView } from "@/app/components/DraftDocumentView";
import { loadDraft, loadEpdRecord, loadGraphDocument, loadVerification } from "@/lib/data";

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

  const graph = loadGraphDocument(stem);
  const draft = loadDraft(stem);
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
        {draft ? (
          <p className="actions-row">
            <Link href={`/epd/${encoded}/verify`} className="btn btn-inline">
              Verify draft vs PDF
            </Link>
            {verification ? (
              <span className="hint">
                Last verified: {new Date(verification.verifiedAt).toLocaleString()} (
                {verification.summary.match} match, {verification.summary.mismatch} mismatch)
              </span>
            ) : null}
          </p>
        ) : (
          <p className="hint">
            No draft yet — run <code>npm run drafts</code>
          </p>
        )}
      </section>

      {draft ? (
        <section className="panel">
          <div className="panel-head">
            <h2>Formatted draft</h2>
            <a href={`/api/drafts/${encoded}`} target="_blank" rel="noreferrer">
              draft.json
            </a>
          </div>
          <DraftDocumentView draft={draft} />
        </section>
      ) : null}

      <section className="panel">
        <div className="panel-head">
          <h2>JSON-LD graph</h2>
          <a href={`/api/graph/${encoded}`} target="_blank" rel="noreferrer">
            Raw JSON-LD
          </a>
        </div>
        {graph ? <JsonBlock data={graph} /> : <p className="hint">Run <code>npm run graph</code> to build.</p>}
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Phase 1 — filename</h2>
          <a href={`/api/phases/${encoded}?phase=1`} target="_blank" rel="noreferrer">
            Raw JSON
          </a>
        </div>
        {record.phase1 ? <JsonBlock data={record.phase1} /> : <p className="hint">Not extracted.</p>}
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Phase 2 — header</h2>
          <a href={`/api/phases/${encoded}?phase=2`} target="_blank" rel="noreferrer">
            Raw JSON
          </a>
        </div>
        {record.phase2 ? <JsonBlock data={record.phase2} /> : <p className="hint">Not extracted.</p>}
      </section>
    </div>
  );
}
