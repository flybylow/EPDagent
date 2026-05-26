import type { TableExportManifest } from "@/lib/tables/types";

export function TableComparePanel({ manifest }: { manifest: TableExportManifest }) {
  return (
    <div className="table-compare-stack">
      {manifest.tables.map((table) => {
        const imageFile = table.image.split("/").pop() ?? "";
        const imageUrl = `/api/table-exports/${encodeURIComponent(manifest.stem)}/${encodeURIComponent(imageFile)}`;
        return (
          <section key={table.id} className="panel table-compare-panel">
            <div className="panel-head">
              <h2>{table.title}</h2>
              <span className="hint">
                {table.phase} · page {table.page}
                {table.section ? ` · §${table.section}` : ""}
              </span>
            </div>
            <div className="table-compare-columns">
              <div className="table-compare-source">
                <h3 className="table-compare-label">PDF page export</h3>
                <img
                  src={imageUrl}
                  alt={`${table.title} — page ${table.page}`}
                  className="table-export-image"
                />
              </div>
              <div className="table-compare-draft">
                <h3 className="table-compare-label">Structured draft</h3>
                <div className="table-draft-placeholder">
                  <p>No structured extraction yet for <code>{table.id}</code>.</p>
                  <p className="hint">
                    Phase JSON will render here as an HTML table for cell-by-cell compare with
                    the export (diagonal headers stay on the PNG).
                  </p>
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
