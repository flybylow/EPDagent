# Vercel deploy: extract local, serve on domain

EPDagent uses **two environments** with different jobs. Do not run full PDF extraction on Vercel Hobby; use the Vercel URL only to **publish** data you already extracted locally.

## Split

| Where | Role | What runs |
|-------|------|-----------|
| **Local** (`npm run dev`, CLI) | **Extract** | Phases, docmap, Claude API, `out/`, optional `/api/extract` from the UI |
| **Vercel** (production domain) | **Serve** | Read APIs for Tabulas / Pentapylas: `/api/products`, `/api/facts`, `/api/graph`, `/api/epds` |

```mermaid
flowchart LR
  PDF[data/EPD PDFs]
  CLI[npm run phase2 / graph / …]
  OUT[out/phase JSON slices]
  GIT[git push]
  VERCEL[Vercel Next.js]
  TAB[Tabulas fetch]

  PDF --> CLI --> OUT --> GIT --> VERCEL --> TAB
```

## Publish workflow (local → Vercel)

1. **Extract locally** (needs `ANTHROPIC_API_KEY`, PDFs in `data/EPD/`):

   ```bash
   npm run phase2 -- "data/EPD/….pdf"
   npm run phase3 -- "data/EPD/….pdf"
   # … other phases as needed
   npm run graph
   ```

2. **Commit published artifacts** (whitelisted in `.gitignore`):

   - `out/phase_docmap/` — **required for section navigation** (PDF table of contents / menu)
   - `out/phase7_epd_sections/` — narrative section text bound to the menu (no PDF parse on Vercel)
   - `out/phase2_header/`, `out/phase3_product/`, `out/phase3_composition/`, `out/phase3_lca_study/`, `out/phase4_lca_probe/`
   - `out/phase5_scenarios/`, `out/phase6_refs/`, `out/phase1_filename/` (optional but matches local dashboard)
   - `data/graph/*.jsonld`

   Build docmaps locally (no Claude API):

   ```bash
   npm run docmap:all
   git add out/phase_docmap/
   git commit -m "Publish docmap indexes for Vercel section nav"
   ```

   Vercel cannot build docmaps from PDF (pdfjs is disabled in serve-only mode). Without committed `out/phase_docmap/{stem}.json`, the detail page has no section menu.

3. **Push to GitHub** → Vercel redeploys.

4. **Tabulas** calls your Vercel base URL, e.g.  
   `https://your-app.vercel.app/api/products?tag=insulation`

See [facts-api.md](facts-api.md) for endpoints, CORS, and env vars.

## What Vercel is not for

- Bulk `npm run phase2 -- --all` on the server (no reliable long runs on Hobby).
- Storing or processing large PDF corpora in serverless functions.
- `ANTHROPIC_API_KEY` on Vercel unless you explicitly accept API cost and timeouts (optional; not required for read-only serve).

The EPD **UI** on Vercel can still list EPDs and show graphs built from committed JSON. In-browser “Extract PDF” may hit route timeouts on Hobby — treat that as a **local dev** feature.

## Serverless `maxDuration` (two limits)

Extract API routes set `export const maxDuration` in:

- `app/api/extract/[...stem]/route.ts`
- `app/api/extract/step/[...stem]/route.ts`

| Environment | Limit | Value in repo | Notes |
|-------------|-------|---------------|--------|
| **Vercel Hobby** | Platform max | **300** seconds | Required for deploy; builder rejects values &gt; 300. |
| **Local `next dev`** | No Vercel cap | Same constant (300) unless you raise it | For long local UI extracts, you may set **600** in those two files on your machine only — **do not push &gt; 300** if the project stays on Hobby. |
| **Vercel Pro** | Up to 800s on some plans | May raise route constant + confirm plan limit | Only after upgrading; still prefer extract via CLI. |

There is no separate env var: Vercel validates the **numeric literal** at build time. “Two limits” means **platform (300 on Hobby)** vs **optional higher value for local/Pro** in source, not two runtime configs.

**Read routes** (`/api/facts`, `/api/products`, `/api/graph`) have no `maxDuration`; they only read JSON from disk and are safe on Vercel.

## Vercel project settings

| Variable | Example | Required for serve |
|----------|---------|-------------------|
| `EPDAGENT_IRI_BASE` | `https://searchepd.vercel.app/id` | **Yes** — wrong value yields `localhost` IRIs in `/api/facts` |
| `EPDAGENT_CORS_ORIGINS` | `https://tabulas.eu,http://localhost:3001` | For browser calls from Tabulas |
| `ANTHROPIC_API_KEY` | — | **Remove** (extract local) |
| `EPDAGENT_PDF_DIR` | — | **Remove** — use repo `data/EPD/`; invalid paths break `/api/epds` and `/api/products` |

## Verify after deploy

```bash
curl -s "https://searchepd.vercel.app/api/products?tag=insulation" | head
curl -s "https://searchepd.vercel.app/api/epds" | head
curl -s "https://searchepd.vercel.app/api/facts/B-EPD_023.0011.007-02.00.00%20Rockwool%20Rockfit%20Mono%20EN%20-%20signed?parts=thermal,lca" | head
```

If `/api/epds` returns **500** with an empty body, check Vercel env: delete **`EPDAGENT_PDF_DIR`** if it points outside the deployment (or to a missing folder).

### pdfjs / EPD detail pages

On Vercel (`VERCEL=1` or `VERCEL_ENV` set), EPD routes use **serve-only** mode: they do not auto-build docmap or phase7 from PDF text, and the in-browser Extract button is hidden. Committed `out/phase_docmap/` (if any) and phase JSON still load.

Do **not** set `EPDAGENT_ALLOW_PDF_PARSE=1` on Vercel (pdfjs worker/canvas fail on serverless). Use that only in local `.env.local` when running extract from the UI.

EPD pages must **not** statically import `ensure-docmap` / `ensure-phase7` (those pull `pdfjs-dist` and fail with missing `pdf.worker.mjs` on serverless). Use `ensurePdfArtifactsForStem()` from `lib/extract/ensure-pdf-artifacts.ts` instead.

Draft/section layout templates (`templates/epd-header.v1.json`, `epd-section-view.v1.json`) are **imported in code** so Vercel bundles them; `next.config.ts` also lists `templates/**/*.json` under `outputFileTracingIncludes` for any runtime `readFileSync` fallbacks.

`pdfjs-dist` optionally loads `@napi-rs/canvas`. The repo lists it under `optionalDependencies`. Extraction stays **local**. Warnings during `/api/extract` on Vercel are expected on Hobby — Tabulas should use `/api/products` and `/api/facts` only.

## Related

- [facts-api.md](facts-api.md) — cross-domain Product Facts API
- [local-dev.md](local-dev.md) — scripts and local server
- [api-budget-policy.md](api-budget-policy.md) — Claude usage (local only)
