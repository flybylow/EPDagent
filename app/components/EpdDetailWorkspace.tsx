import { Phase3CompositionView } from "@/app/components/Phase3CompositionView";
import { Phase3ProductView } from "@/app/components/Phase3ProductView";
import { formatPhaseTitle } from "@/lib/phases/format";
import { DocmapTreeView } from "@/app/components/DocmapTreeView";
import { DraftDocumentView } from "@/app/components/DraftDocumentView";
import { PhaseStatusBadge } from "@/app/components/PhaseStatusBadge";
import { TableCompareRow } from "@/app/components/TableCompareRow";
import type { EpdPhaseRegistry, ResolvedPhase } from "@/lib/phases/registry";
import type { Phase1Data } from "@/lib/types";

function Phase1Summary({ phase1 }: { phase1: Phase1Data }) {
  return (
    <dl className="draft-doc-fields phase1-summary">
      <div className="draft-doc-field">
        <dt>EPD number</dt>
        <dd>{phase1.epd_number ?? "—"}</dd>
      </div>
      <div className="draft-doc-field">
        <dt>Language</dt>
        <dd>{phase1.language ?? "—"}</dd>
      </div>
      <div className="draft-doc-field">
        <dt>Filename pattern</dt>
        <dd>{phase1.pattern ?? "—"}</dd>
      </div>
      <div className="draft-doc-field">
        <dt>Source file</dt>
        <dd>{phase1.pdf_filename ?? "—"}</dd>
      </div>
    </dl>
  );
}

function PhasePanelBody({
  phase,
  registry,
}: {
  phase: ResolvedPhase;
  registry: EpdPhaseRegistry;
}) {
  if (phase.id === "docmap") {
    if (registry.docmap?.flat_entries.length) {
      return <DocmapTreeView docmap={registry.docmap} />;
    }
    return (
      <p className="hint">
        No index entries yet. Run <code>npm run docmap</code> on this PDF.
      </p>
    );
  }

  if (phase.id === "phase1" && registry.phase1) {
    return <Phase1Summary phase1={registry.phase1} />;
  }

  if (phase.id === "phase2" && registry.draft) {
    return <DraftDocumentView draft={registry.draft} />;
  }

  if (phase.id === "phase3_product" && registry.phase3) {
    return (
      <div className="stack-md">
        <Phase3ProductView data={registry.phase3} />
        {phase.tables.map((table) => (
          <div key={table.id}>
            <p className="hint">
              Page {table.page}
              {table.section ? ` · §${table.section}` : ""} · PDF compare
            </p>
            <TableCompareRow stem={registry.stem} table={table} />
          </div>
        ))}
      </div>
    );
  }

  if (phase.id === "phase3_composition" && registry.phase3Composition) {
    return (
      <div className="stack-md">
        <Phase3CompositionView data={registry.phase3Composition} />
        {phase.tables.map((table) => (
          <div key={table.id}>
            <p className="hint">
              Page {table.page}
              {table.section ? ` · §${table.section}` : ""} · PDF compare
            </p>
            <TableCompareRow stem={registry.stem} table={table} />
          </div>
        ))}
      </div>
    );
  }

  if (phase.tables.length > 0) {
    return (
      <div className="stack-md">
        {phase.tables.map((table) => (
          <div key={table.id}>
            <p className="hint">
              Page {table.page}
              {table.section ? ` · §${table.section}` : ""}
            </p>
            <TableCompareRow stem={registry.stem} table={table} />
          </div>
        ))}
      </div>
    );
  }

  if (phase.status === "pending") {
    return (
      <p className="hint">
        Not extracted yet.
        {phase.entryCount ? ` ${phase.entryCount} table(s) registered.` : ""}
        {phase.id === "phase3_composition" ? (
          <>
            {" "}
            Run <code>npm run phase3-composition</code>.
          </>
        ) : null}
      </p>
    );
  }

  if (phase.status === "empty") {
    return <p className="hint">No data for this phase.</p>;
  }

  return (
    <p className="hint">
      Raw JSON available
      {phase.apiUrl ? (
        <>
          {" "}
          via{" "}
          <a href={phase.apiUrl} target="_blank" rel="noreferrer">
            API
          </a>
        </>
      ) : null}
      .
    </p>
  );
}

function PhasePanel({
  phase,
  registry,
}: {
  phase: ResolvedPhase;
  registry: EpdPhaseRegistry;
}) {
  const encoded = encodeURIComponent(registry.stem);
  const jsonLink =
    phase.id === "docmap"
      ? `/api/docmap/${encoded}`
      : phase.apiUrl;

  return (
    <section className="panel phase-panel" id={`phase-${phase.id}`}>
      <div className="panel-head">
        <div className="phase-panel-head-main">
          <h2>{formatPhaseTitle(phase)}</h2>
          <PhaseStatusBadge status={phase.status} />
        </div>
        {jsonLink && phase.status !== "pending" ? (
          <a href={jsonLink} target="_blank" rel="noreferrer">
            {phase.id === "docmap"
              ? "docmap.json"
              : phase.id === "phase2" && registry.draft
                ? "draft.json"
                : phase.id === "phase3_composition"
                  ? "composition.json"
                  : "json"}
          </a>
        ) : phase.id === "phase2" && registry.draft ? (
          <a href={`/api/drafts/${encoded}`} target="_blank" rel="noreferrer">
            draft.json
          </a>
        ) : null}
      </div>
      <p className="hint phase-panel-desc">{phase.description}</p>
      <div className="phase-panel-body">
        <PhasePanelBody phase={phase} registry={registry} />
      </div>
    </section>
  );
}

export function EpdDetailWorkspace({
  registry,
  pdfAvailable,
}: {
  registry: EpdPhaseRegistry;
  pdfAvailable: boolean;
}) {
  const encoded = encodeURIComponent(registry.stem);
  const pdfUrl = `/api/pdf/${encoded}`;

  return (
    <div className="epd-detail-workspace">
      <div className="verify-columns epd-detail-columns">
        <section className="panel verify-source epd-detail-pdf">
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
              <p>
                No PDF in <code>data/EPD/</code> for this stem.
              </p>
            </div>
          )}
        </section>

        <div className="epd-detail-phases">
          {registry.phases.map((phase) => (
            <PhasePanel key={phase.id} phase={phase} registry={registry} />
          ))}
        </div>
      </div>
    </div>
  );
}
