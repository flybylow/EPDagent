# Draft templates & verification

Formatted **drafts** turn raw phase JSON into a stable, human-readable layout. **AI verification** compares each templated field to the source PDF.

## Pipeline

```text
phase JSON  →  templates/epd-header.v1.json  →  out/drafts/<stem>/
                                                    ├── draft.json
                                                    ├── draft.html
                                                    └── manifest.json
```

Run after extraction (or with demo data):

```bash
npm run drafts
```

`npm run demo` and `npm run pipeline` call this automatically.

## Template format

Templates live in `templates/` as JSON. Schema: `schemas/draft_template.json`.

Each field maps a **label** to a dot **path** in phase data (`phase2.producer.name`, `phase1.language`, …). Optional `format`: `text`, `date`, or `enum` with `enumLabels`.

To add fields or sections, edit `templates/epd-header.v1.json` and re-run `npm run drafts`.

## Verify UI

Open **Verify draft vs PDF** from the EPD list or detail page:

- **Left:** original PDF (`pdfs/<stem>.pdf`)
- **Right:** formatted draft from template
- **Below:** AI field-by-field check (Claude + `ANTHROPIC_API_KEY`)

Results persist to `out/verification/<stem>.json`.

API:

- `GET /api/drafts/[stem]` — draft + manifest
- `POST /api/verify/[stem]` — run verification
- `GET /api/verify/[stem]` — last result
- `GET /api/pdf/[stem]` — inline PDF

## Status values

| Status | Meaning |
|--------|---------|
| `match` | Draft aligns with PDF |
| `mismatch` | Different value in PDF |
| `missing_in_draft` | In PDF, empty in draft |
| `missing_in_pdf` | In draft, not found in PDF |
| `unclear` | Cannot determine (or no PDF) |
