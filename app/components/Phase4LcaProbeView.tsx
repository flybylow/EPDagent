import {
  buildLcaCanonicalGrid,
  LCA_CANONICAL_MODULES,
} from "@/lib/lca/canonical-grid";
import type { Phase4LcaProbeData } from "@/lib/types";

export function Phase4LcaProbeView({ data }: { data: Phase4LcaProbeData }) {
  const grid = buildLcaCanonicalGrid(data);
  const hasRows = grid.rows.length > 0;

  return (
    <div className="phase3-doc">
      {data.table_title ? <p className="docmap-doc-meta">{data.table_title}</p> : null}
      {hasRows ? (
        <div className="data-table-wrap">
          <table className="data-table phase4-lca-table lca-module-grid-table">
            <thead>
              <tr>
                <th className="lca-grid-indicator-col">Indicator</th>
                {LCA_CANONICAL_MODULES.map((mod) => (
                  <th key={mod} className="lca-grid-module-col">
                    {mod}
                  </th>
                ))}
                {grid.extraColumns.map((col) => (
                  <th key={col.code} className="lca-grid-module-col" title={col.label ?? undefined}>
                    {col.code}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.rows.map((row, rowIndex) => (
                <tr key={`row-${rowIndex}`}>
                  <td className="lca-grid-indicator-col">
                    {row.indicator}
                    {row.unit ? (
                      <>
                        <br />
                        <span className="hint">({row.unit})</span>
                      </>
                    ) : null}
                  </td>
                  {LCA_CANONICAL_MODULES.map((mod) => (
                    <td key={mod} className="phase4-cell-mono lca-grid-module-col">
                      {row.cells[mod] ?? "—"}
                    </td>
                  ))}
                  {grid.extraColumns.map((col) => (
                    <td key={col.code} className="phase4-cell-mono lca-grid-module-col">
                      {row.extraCells[col.code] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="hint">No LCA table rows extracted yet.</p>
      )}
      {data.capture?.notes ? <p className="hint">{data.capture.notes}</p> : null}
    </div>
  );
}
