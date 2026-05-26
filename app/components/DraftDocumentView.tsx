import type { DraftDocument } from "@/lib/templates/types";

export function DraftDocumentView({ draft }: { draft: DraftDocument }) {
  return (
    <div className="draft-doc">
      <header className="draft-doc-header">
        <h2>{draft.title}</h2>
        <p className="draft-doc-meta">
          {draft.templateId} v{draft.templateVersion}
          {draft.pdfFilename ? ` · ${draft.pdfFilename}` : ""}
        </p>
      </header>
      {draft.sections.map((section) => (
        <section key={section.id} className="draft-doc-section">
          <h3>{section.title}</h3>
          <dl className="draft-doc-fields">
            {section.fields.map((field) => (
              <div
                key={field.id}
                className={`draft-doc-field${field.empty ? " is-empty" : ""}`}
                data-field-id={field.id}
              >
                <dt>{field.label}</dt>
                <dd>{field.displayValue}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
