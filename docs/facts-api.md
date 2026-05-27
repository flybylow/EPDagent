# Product Facts API (cross-domain read)

Prototype API for **Tabulas / Pentapylas** to discover EPDs and fetch **partial facts** (thermal λ, LCA modules) without downloading full JSON-LD graphs.

EPDagent remains the **manufacturer ingest + publish** side; the consumer app calls these routes from another origin (CORS) or via a server proxy.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/products?tag=insulation` | Catalog with tags + `facts_url` |
| `GET` | `/api/products?q=rockwool` | Substring search on name / description |
| `GET` | `/api/epds?tag=insulation` | Same filter on full EPD index |
| `GET` | `/api/facts/{stem}?parts=thermal,lca` | Sliced facts for one EPD |

### `parts` (facts route)

Comma-separated; default = all available parts.

| Part | Content |
|------|---------|
| `identity` | stem, IRI, EPD number, producer |
| `product` | description, intended use, reference flow, **tags** |
| `thermal` | λ and related rows from phase 3 technical table |
| `lca` | Canonical EN 15804 module grid (GWP total, A1–D, …) |
| `composition` | Phase 3 composition rows |

Response schema: `epdagent.product-facts.v1` (see `lib/facts/types.ts`).

## CORS

Enabled on `/api/epds`, `/api/products`, `/api/facts/*`, `/api/graph/*`.

Default allowed origins:

- `http://localhost:3000`, `http://localhost:3001`
- `https://tabulas.eu`, `https://www.tabulas.eu`

Override:

```bash
EPDAGENT_CORS_ORIGINS=http://localhost:3001,https://tabulas.eu
```

For production Tabulas, prefer a **server-side proxy** to EPDagent and keep secrets off the browser; CORS is still useful for local UI dev on port 3001.

## Local test loop

```bash
# Unit tests (no server)
npm run test:facts

# Terminal 1
npm run dev

# Terminal 2 — simulates Tabulas on :3001
npm run test:facts-api
```

Manual:

```bash
curl -s 'http://localhost:3000/api/products?tag=insulation' | head
curl -s 'http://localhost:3000/api/facts/B-EPD_023.0011.007-02.00.00%20Rockwool%20Rockfit%20Mono%20EN%20-%20signed?parts=thermal,lca' | head
```

## Vercel (serve only)

**Extract locally, serve on the Vercel domain.** Full workflow, `maxDuration` limits (300s Hobby vs local/Pro), and what not to run on Vercel: **[vercel-deploy.md](vercel-deploy.md)**.

Quick checklist:

- Commit `out/phase2_header/`, `out/phase3_product/`, `out/phase4_lca_probe/`, … and `data/graph/*.jsonld` after local extract.
- Set `EPDAGENT_IRI_BASE` and `EPDAGENT_CORS_ORIGINS` on the Vercel project.
- Tabulas calls `https://your-app.vercel.app/api/products?tag=insulation` (no extraction on Vercel Hobby).

The `node-domexception` npm warning on install is a transitive dependency notice; safe to ignore for deploy.

## Move to Tabulas

1. Copy only the **client** (`fetch` + types); keep publish API on EPDagent.
2. Set `EPDAGENT_API_BASE=https://…` in Tabulas.
3. Matching UI + BIM quantities stay in Tabulas; POST normalized payload to your external calculator.

## Related

- [architecture.md](architecture.md) — EPDagent vs consumer split
- [knowledge-graph.md](knowledge-graph.md) — full JSON-LD when you need the whole graph
- [local-dev.md](local-dev.md) — dev server and scripts
