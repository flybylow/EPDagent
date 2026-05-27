import type { Phase6RefsData } from "@/lib/types";

export function Phase6RefsView({ data }: { data: Phase6RefsData }) {
  return (
    <div className="phase3-doc">
      {data.bibliography.length > 0 ? (
        <section className="draft-doc-section">
          <h3>Bibliography</h3>
          <ul className="phase6-ref-list">
            {data.bibliography.map((ref) => (
              <li key={ref}>{ref}</li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="hint">No bibliography entries extracted.</p>
      )}
      {data.additional_information?.length ? (
        <section className="draft-doc-section">
          <h3>Additional information</h3>
          <ul className="phase6-ref-list">
            {data.additional_information.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
