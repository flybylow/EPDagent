import { formatDisplayText } from "@/lib/format/display-text";
import type { Phase3LcaStudyData } from "@/lib/types";

const FIELD_LABELS: Array<{ key: keyof Phase3LcaStudyData; label: string }> = [
  { key: "standards_and_methodology", label: "Standards and methodology" },
  { key: "pcr_reference", label: "PCR reference" },
  { key: "lca_software_and_database", label: "LCA software and database" },
  { key: "goal_and_scope", label: "Goal and scope" },
  { key: "functional_unit", label: "Functional unit" },
  { key: "system_boundaries", label: "System boundaries" },
  { key: "production_sites", label: "Production sites" },
  { key: "cut_off_criteria", label: "Cut-off criteria" },
  { key: "allocation", label: "Allocation" },
  { key: "data_quality", label: "Data quality" },
  { key: "time_representativeness", label: "Time representativeness" },
  { key: "geographical_representativeness", label: "Geographical representativeness" },
  { key: "technology_representativeness", label: "Technology representativeness" },
  { key: "impact_assessment", label: "Impact assessment" },
  { key: "interpretation", label: "Interpretation" },
];

export function Phase3LcaStudyView({ data }: { data: Phase3LcaStudyData }) {
  const fields = FIELD_LABELS.filter(({ key }) => {
    const v = data[key];
    return typeof v === "string" && v.trim().length > 0;
  });

  return (
    <div className="phase3-doc">
      {data.section_title ? (
        <p className="docmap-doc-meta">{formatDisplayText(data.section_title)}</p>
      ) : null}
      {fields.length > 0 ? (
        <dl className="draft-doc-fields">
          {fields.map(({ key, label }) => (
            <div key={key} className="draft-doc-field">
              <dt>{label}</dt>
              <dd>{formatDisplayText(data[key] as string)}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {data.additional_paragraphs?.length ? (
        <div className="stack-md">
          {data.additional_paragraphs.map((p, i) => (
            <p key={i} className="scenario-text">
              {formatDisplayText(p)}
            </p>
          ))}
        </div>
      ) : null}
      {!fields.length && !data.additional_paragraphs?.length ? (
        <p className="hint">No LCA study fields extracted.</p>
      ) : null}
    </div>
  );
}
