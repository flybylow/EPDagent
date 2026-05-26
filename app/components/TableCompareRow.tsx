import type { TableExportManifest } from "@/lib/tables/types";

export function TableCompareRow({
  stem,
  table,
}: {
  stem: string;
  table: TableExportManifest["tables"][number];
}) {
  const imageFile = table.image.split("/").pop() ?? "";
  const imageUrl = `/api/table-exports/${encodeURIComponent(stem)}/${encodeURIComponent(imageFile)}`;

  return (
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
            Phase JSON will render here as an HTML table for cell-by-cell compare with the export.
          </p>
        </div>
      </div>
    </div>
  );
}
