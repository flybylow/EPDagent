# EPD Extraction — phased pipeline

Local-first TypeScript pipeline for extracting structured data from BEBD EPD PDFs. A **Next.js** app and **JSON-LD** knowledge graph sit on top of phase outputs. Internal docs: [docs/INDEX.md](docs/INDEX.md).

## Quick start (localhost)

```bash
npm install
npm run demo    # load demo fixtures → out/ + data/graph/
npm run dev     # http://localhost:3000
```

The demo seeds two sample EPDs so you can browse the UI and JSON-LD APIs without PDFs or an API key.

## Phases

| Phase | What | Tech | Output |
|-------|------|------|--------|
| 1 | Filename parse | regex | `out/phase1_filename/<id>.json` |
| 2 | Header metadata | Claude API (Sonnet) | `out/phase2_header/<id>.json` |
| 3 | Product identification | TBD | `out/phase3_product/<id>.json` |
| 4 | LCA tables | TBD | `out/phase4_lca/<id>.json` |
| 5 | Scenarios | TBD | `out/phase5_scenarios/<id>.json` |
| 6 | References | TBD | `out/phase6_refs/<id>.json` |

After phase outputs exist, build the knowledge graph and formatted drafts:

```bash
npm run graph
npm run drafts
```

Drafts are also regenerated automatically at the end of each phase 1 / phase 2 run.

Writes `data/graph/<stem>.jsonld`, `out/drafts/<stem>/draft.json`, and `draft.html`.

## With real PDFs

Point at your EPD folder (e.g. `Data of EPD`) in `.env`:

```bash
cp .env.example .env
# EPDAGENT_PDF_DIR="/path/to/Data of EPD"
# ANTHROPIC_API_KEY=...   # required for Extract PDF / phase 2
```

Or symlink PDFs into the project:

```bash
ln -s "/path/to/Data of EPD" ./pdfs
```

Use **Extract PDF** on the home page, or CLI:

```bash
npm run phase1 -- --all
npm run phase2 -- --all   # requires ANTHROPIC_API_KEY
npm run graph
npm run dev
```

## API routes

| Route | Description |
|-------|-------------|
| `GET /api/epds` | List EPDs and phase status |
| `GET /api/phases/[stem]?phase=1\|2` | Raw phase JSON |
| `GET /api/graph/[stem]` | Per-EPD JSON-LD (`application/ld+json`) |
| `GET /api/graph/corpus` | Merged corpus JSON-LD |
| `GET /api/context` | JSON-LD `@context` |
| `GET /api/drafts/[stem]` | Formatted draft + manifest |
| `POST /api/verify/[stem]` | AI verify draft vs PDF |
| `GET /api/pdf/[stem]` | Inline source PDF |

## Verify

Open `/epd/[stem]/verify` for side-by-side PDF + templated draft, then run AI verification.

## Layout

| Path | Role |
|------|------|
| `app/` | Next.js UI and API |
| `lib/` | Shared paths, JSON-LD builder, data readers |
| `src/` | CLI extraction and graph scripts |
| `schemas/` | JSON Schema per phase |
| `fixtures/demo/` | Sample phase outputs for `npm run demo` |
| `data/graph/` | JSON-LD output |
| `docs/` | Internal knowledge base |

## Schema

Per-phase JSON schemas live in `schemas/`. They are tech-agnostic so extractors can be swapped without changing the graph contract.
