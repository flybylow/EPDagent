# Table extraction & visual verify

EPD tables (composition, LCA impacts, technical data) often use **diagonal headers**, merged cells, and module columns (A1–D). Text-only PDF parsing loses structure; Claude on a full PDF is expensive and still brittle.

## Strategy (two layers)

```text
PDF page (known from docmap / registry)
        │
        ├──► out/table_exports/<stem>/<tableId>.page-N.png   visual source (always)
        │
        └──► out/phaseN_*/<stem>.json                      structured data (later)
                    │
                    └──► draft template table section       side-by-side in Verify
```

1. **Visual layer first** — rasterize the page containing the table; show it in Verify next to the structured draft (same pattern as cover PDF vs header draft).
2. **Structured layer second** — extract rows/columns into JSON when we trust the schema; compare cell-by-cell or re-use AI verify on the export PNG only (not the full PDF).

## Table types (EN 15804 B-EPD)

| Table id | Typical section | Phase | Example (Rockwool) |
|----------|-----------------|-------|---------------------|
| `composition` | Composition and content | 3 | Page 6 — Stonewool / resin / packaging |
| `technical_data` | Technical / physical characteristics | 3 | Page 8 |
| `lca_impacts` | Potential environmental impacts per reference unit | 4 | Page 13 — §6, modules A1–D columns |

Diagonal labels and module grids are why **page PNG export** precedes full parsing.

## Outputs

| Path | Purpose |
|------|---------|
| `out/table_exports/<stem>/manifest.json` | Table ids, titles, source pages, PNG paths |
| `out/table_exports/<stem>/<id>.page-N.png` | Visual source for Verify |
| `out/phase3_composition/<stem>.json` | Structured composition (TBD) |
| `out/phase4_lca_probe/<stem>.p<N>.json` | Structured LCA grid (phase 4 probe, one file per page) |

## Verify UI

Below the header PDF ↔ draft columns, each registered table gets a row:

- **Left:** exported page PNG (scroll/zoom)
- **Right:** HTML table from phase JSON, or placeholder until extraction exists

AI verification for tables should target the **table PNG + structured JSON**, not the full EPD.

## CLI

```bash
# Page PNGs for side-by-side compare in the UI
npm run export-tables -- "data/EPD/….pdf"

# One LCA table page (rotated module headers → JSON)
npm run phase4-probe -- "data/EPD/….pdf" --pages 13

# All LCA tables listed in data/reference/<id>/tables.json
npm run phase4-lca -- "data/EPD/….pdf"
```

Registry: `data/reference/<id>/tables.json` — each `phase4_lca` row needs `id`, `page`, and `section`. Probes are saved as `out/phase4_lca_probe/<stem>.p<page>.json` (legacy `/<stem>.json` for a single impacts table).

Uses `data/reference/*/tables.json` when present, else heuristics from page text search.

## Related

- [api-budget-policy.md](api-budget-policy.md) — page-limited API calls
- [pipeline-overview.md](pipeline-overview.md) — phases 3–4
