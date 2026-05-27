# Local development

## First run

```bash
npm install
npm run demo
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Demo fixtures populate `out/` and `data/graph/` without PDFs or API keys.

If you see `Cannot find module './NNN.js'`, stop the dev server, run `npm run clean`, then `npm run dev` again (stale `.next` webpack chunks).

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Next.js on port 3000 |
| `npm run demo` | Copy `fixtures/demo/` → `out/`, build JSON-LD |
| `npm run phase1 -- --all` | Parse all PDFs in `pdfs/` |
| `npm run phase2 -- --all` | Extract headers (needs `ANTHROPIC_API_KEY`) |
| `npm run graph` | Build `data/graph/*.jsonld` from `out/` |
| `npm run drafts` | Build formatted drafts in `out/drafts/` |
| `npm run export-tables -- <pdf>` | Export table pages as PNG for visual verify |
| `npm run pipeline` | Phase 1 on all PDFs + graph + drafts |

## Environment

Copy `.env.example` → `.env`.

- `ANTHROPIC_API_KEY` — required for phase 2 only
- `EPDAGENT_IRI_BASE` — defaults to `http://localhost:3000/id` for JSON-LD `@id` values
- `EPDAGENT_MAX_PDF_BYTES` / `EPDAGENT_ALLOW_BULK_API` — see [api-budget-policy.md](api-budget-policy.md)

## API

### Product Facts (cross-domain prototype)

See [facts-api.md](facts-api.md). Quick check:

```bash
npm run test:facts
npm run dev   # other terminal
npm run test:facts-api
```

- `GET /api/products?tag=insulation` — discover products
- `GET /api/facts/[stem]?parts=thermal,lca` — slices for calculators

Set `EPDAGENT_CORS_ORIGINS` for Tabulas dev (default includes `localhost:3001`).

### JSON-LD graph

Graph routes return `Content-Type: application/ld+json`.

- `GET /api/epds` — corpus index (`?tag=insulation` supported)
- `GET /api/graph/corpus` — merged `@graph`
- `GET /api/graph/[stem]` — single EPD document
- `GET /api/context` — shared `@context`

## Folder outputs

| Path | Produced by |
|------|-------------|
| `out/phase1_filename/` | `npm run phase1` |
| `out/phase2_header/` | `npm run phase2` |
| `out/pdf_slices/` | page excerpts sent to Claude (phase 2) |
| `data/graph/` | `npm run graph` |
