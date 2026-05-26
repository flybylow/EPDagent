import type { Phase3CompositionData } from "@/lib/types";

export function Phase3CompositionView({ data }: { data: Phase3CompositionData }) {
  const rows = data.components ?? [];

  return (
    <div className="phase3-doc">
      {rows.length > 0 ? (
        <div className="phase3-table-wrap">
          <table className="phase3-table">
            <thead>
              <tr>
                <th>Section</th>
                <th>Component</th>
                <th>Composition / content</th>
                <th>Quantity</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={`${row.component}-${i}`}>
                  <td>{row.section ?? "—"}</td>
                  <td>{row.component ?? "—"}</td>
                  <td>{row.composition ?? "—"}</td>
                  <td>{row.quantity ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="hint">No composition rows extracted.</p>
      )}

      {data.declarations?.length ? (
        <ul className="phase3-declarations">
          {data.declarations.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
