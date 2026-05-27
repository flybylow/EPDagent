# Cover page extraction (phase 2)

The **Cover & declaration** section in the UI comes from **phase 2**: one Claude call on a small PDF slice, structured via `schemas/phase2_header.json` and `templates/epd-header.v1.json`.

## What page 1 is

On typical B-EPD / EN 15804 PDFs, **physical page 1** is the declaration cover (not docmap §1):

| Cover element | JSON field |
|---------------|------------|
| Product title | `product_name` |
| Product type line | `product_description` |
| Registration / EPD number | `epd_number` |
| Program operator (full name) | `program_operator` |
| Short code (B-EPD, …) | `program_operator_code` |
| MODULES DECLARED + scope sentence | `declared_modules`, `declared_scope` |
| Declared unit (1 m², …) | `declared_unit` |
| Issue / valid until dates | `validity.issued`, `validity.valid_until` |
| PCR line | `pcr_reference` |
| Verification badge text | `verification_statement` |
| “in accordance with …” | `conformity_basis` |
| Manufacturer | `producer.name`, `producer.country` |

**Docmap section 1** (“Product description”) often starts on **page 5+** — that is a different chapter and must not be mixed into the cover slice.

## How we parse it with AI

```text
data/EPD/<stem>.pdf
       │
       ▼
resolveCoverPageSpec()     → default "1" (EPDAGENT_COVER_PAGES)
resolveVerifierPageSpec()  → docmap §12 page if not on cover (e.g. ",27")
       │
       ▼
slicePdfByPageSpec()       → tiny PDF (cover ± verifier page)
       │
       ▼
Claude + record_epd_header tool  → out/phase2_header/<stem>.json
       │
       ▼
buildDraft()               → out/drafts/<stem>/draft.json  (UI grid)
```

Model: `claude-sonnet-4-5`, document input (PDF base64), `max_tokens: 2048`.

Phase 1 only parses the **filename** (regex). All cover text comes from phase 2.

## Commands

```bash
# Cover only (page 1) + verifier page when docmap has §12 elsewhere
npm run phase2 -- "data/EPD/<stem>.pdf"

# Force refresh after prompt/page changes
npm run phase2 -- --force "data/EPD/<stem>.pdf"
```

Override cover pages: `EPDAGENT_COVER_PAGES=1-2` in `.env`.

Reference manifest example: `phase2Pages: "1-4,18,21"` in `data/reference/.../manifest.json` (cover range + signature pages).

## Troubleshooting

| Symptom | Cause | Fix |
|---------|--------|-----|
| Missing verifier | Name only on last pages | Re-run phase 2 (adds §12 page) or run phase 7 first (enrichment) |
| Wrong dates | Model copied issue into valid_until | Re-run with `--force`; check cover has two distinct dates |
| Empty cover | Slice used docmap §1 (p5+) instead of p1 | Fixed: cover spec is physical page 1 only |
| Huge API slice | Scanned cover page ~1 MB | Normal; still under `EPDAGENT_MAX_API_PDF_BYTES` |

## Related

- [api-budget-policy.md](api-budget-policy.md) — when to call the API
- `templates/epd-header.v1.json` — UI field layout
