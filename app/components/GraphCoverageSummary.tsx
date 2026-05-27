type Coverage = Record<string, boolean | string[]>;

const LABELS: Record<string, string> = {
  phase1: "Phase 1 · filename",
  phase2: "Phase 2 · header",
  phase3_product: "Phase 3 · product",
  phase3_composition: "Phase 3 · composition",
  phase3_lca_study: "Phase 3 · LCA study",
  phase4_lca: "Phase 4 · LCA tables",
  phase5_scenarios: "Phase 5 · scenarios",
  phase6_refs: "Phase 6 · references",
  phase7_epd_sections: "Phase 7 · EPD sections",
};

export function GraphCoverageSummary({
  coverage,
  nodeCount,
}: {
  coverage: Coverage | undefined;
  nodeCount: number;
}) {
  if (!coverage) return null;

  const entries = Object.entries(coverage);

  return (
    <div className="graph-coverage">
      <p className="graph-coverage-lead">
        <strong>{nodeCount}</strong> graph nodes · built from current extraction outputs
      </p>
      <ul className="graph-coverage-list">
        {entries.map(([key, value]) => {
          const label = LABELS[key] ?? key;
          const on = Array.isArray(value) ? value.length > 0 : Boolean(value);
          const detail = Array.isArray(value) ? value.join(", ") : null;
          return (
            <li key={key} className={`graph-coverage-item${on ? " is-on" : " is-off"}`}>
              <span className="graph-coverage-label">{label}</span>
              {detail ? <span className="graph-coverage-detail">{detail}</span> : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
