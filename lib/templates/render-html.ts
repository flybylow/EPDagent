import type { DraftDocument } from "./types";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderDraftHtml(draft: DraftDocument): string {
  const sections = draft.sections
    .map(
      (section) => `
    <section class="draft-section">
      <h2>${escapeHtml(section.title)}</h2>
      <dl class="draft-fields">
        ${section.fields
          .map(
            (field) => `
          <div class="draft-field${field.empty ? " draft-field-empty" : ""}" data-field-id="${escapeHtml(field.id)}">
            <dt>${escapeHtml(field.label)}</dt>
            <dd>${escapeHtml(field.displayValue)}</dd>
          </div>`
          )
          .join("")}
      </dl>
    </section>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(draft.title)} — draft</title>
  <style>
    :root {
      --bg: #fff;
      --text: #1a1a1a;
      --muted: #5c6570;
      --border: #d8dee6;
      --accent: #1a5fb4;
      --empty: #9aa3ad;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 2rem;
      font: 15px/1.5 ui-sans-serif, system-ui, sans-serif;
      color: var(--text);
      background: var(--bg);
    }
    .draft-header {
      border-bottom: 2px solid var(--accent);
      padding-bottom: 1rem;
      margin-bottom: 1.5rem;
    }
    .draft-header h1 { margin: 0 0 0.25rem; font-size: 1.5rem; }
    .draft-meta { margin: 0; color: var(--muted); font-size: 0.9rem; }
    .draft-section { margin-bottom: 1.75rem; }
    .draft-section h2 {
      margin: 0 0 0.75rem;
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--muted);
    }
    .draft-fields { margin: 0; }
    .draft-field {
      display: grid;
      grid-template-columns: 11rem 1fr;
      gap: 0.75rem;
      padding: 0.55rem 0;
      border-bottom: 1px solid var(--border);
    }
    .draft-field dt { margin: 0; font-weight: 600; }
    .draft-field dd { margin: 0; }
    .draft-field-empty dd { color: var(--empty); font-style: italic; }
  </style>
</head>
<body>
  <header class="draft-header">
    <h1>${escapeHtml(draft.title)}</h1>
    <p class="draft-meta">
      Template ${escapeHtml(draft.templateId)} v${escapeHtml(draft.templateVersion)}
      · ${escapeHtml(draft.stem)}
      ${draft.pdfFilename ? ` · ${escapeHtml(draft.pdfFilename)}` : ""}
    </p>
  </header>
  ${sections}
</body>
</html>`;
}
