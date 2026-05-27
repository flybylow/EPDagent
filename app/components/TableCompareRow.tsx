import { Phase4LcaProbeView } from "@/app/components/Phase4LcaProbeView";
import type { Phase4LcaProbeData } from "@/lib/types";
import type { TableExportManifest } from "@/lib/tables/types";

export function TableCompareRow({
  stem,
  table,
  probe,
}: {
  stem: string;
  table: TableExportManifest["tables"][number];
  probe?: Phase4LcaProbeData | null;
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
        <h3 className="table-compare-label">Structured extraction</h3>
        {probe && (probe.columns.length > 0 || probe.rows.length > 0) ? (
          <Phase4LcaProbeView data={probe} />
        ) : (
          <div className="table-draft-placeholder">
            <p>No structured extraction yet for <code>{table.id}</code>.</p>
            <p className="hint">
              Run{" "}
              <code>
                npm run phase4-probe -- &quot;…pdf&quot; --pages{" "}
                {table.probePages ?? table.page}
                {" --force"}
              </code>{" "}
              or <code>npm run phase4-lca -- &quot;…pdf&quot;</code> for all LCA tables.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
