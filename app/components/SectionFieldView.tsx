import type { ResolvedSectionField } from "@/lib/templates/section-view-types";

export function SectionFieldView({ fields }: { fields: ResolvedSectionField[] }) {
  const visible = fields.filter((f) => !f.empty);
  if (!visible.length) return null;

  return (
    <dl className="draft-doc-fields">
      {visible.map((field) => (
        <div key={field.id} className="draft-doc-field">
          <dt>{field.label}</dt>
          <dd>{field.displayValue}</dd>
        </div>
      ))}
    </dl>
  );
}
