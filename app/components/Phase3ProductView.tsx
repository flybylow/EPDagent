import type { Phase3ProductData } from "@/lib/types";

function TextBlock({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value?.trim()) return null;
  return (
    <div className="draft-doc-field">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function Phase3ProductView({ data }: { data: Phase3ProductData }) {
  const rows = data.technical_properties ?? [];

  return (
    <div className="phase3-doc">
      <section className="draft-doc-section">
        <h3>Product description</h3>
        <dl className="draft-doc-fields">
          <TextBlock label="Description" value={data.description} />
          <TextBlock label="Intended use" value={data.intended_use} />
          <TextBlock
            label="Reference flow"
            value={
              data.reference_flow.description ??
              (data.reference_flow.value != null
                ? `${data.reference_flow.value} ${data.reference_flow.unit ?? ""}`.trim()
                : null)
            }
          />
          <TextBlock label="Installation" value={data.installation} />
          <TextBlock
            label="Reference service life"
            value={
              data.reference_service_life_years != null
                ? `${data.reference_service_life_years} years`
                : null
            }
          />
          <TextBlock label="Geographical representativity" value={data.geographical_representativity} />
          <TextBlock label="Production process" value={data.production_process} />
        </dl>
      </section>

      {rows.length > 0 ? (
        <section className="draft-doc-section">
          <h3>Technical data</h3>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Standard</th>
                  <th>Value</th>
                  <th>Unit</th>
                  <th>Comment</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={`${row.property}-${i}`}>
                    <td>{row.property ?? "—"}</td>
                    <td>{row.standard ?? "—"}</td>
                    <td>{row.value ?? "—"}</td>
                    <td>{row.unit ?? "—"}</td>
                    <td>{row.comment ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
