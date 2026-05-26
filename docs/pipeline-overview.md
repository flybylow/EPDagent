# Extraction pipeline

Six phases extract structured data from BEBD EPD PDFs. Each phase is a separate script, schema, and output directory.

## Phase table

| Phase | Name | Extractor (planned / current) | Output |
|-------|------|--------------------------------|--------|
| 1 | Filename parse | regex | `out/phase1_filename/<id>.json` |
| 2 | Header metadata | Claude API (Sonnet) | `out/phase2_header/<id>.json` |
| 3 | Product identification | TBD | `out/phase3_product/<id>.json` |
| 4 | LCA tables | TBD | `out/phase4_lca/<id>.json` |
| 5 | Scenarios | TBD | `out/phase5_scenarios/<id>.json` |
| 6 | References | TBD | `out/phase6_refs/<id>.json` |

## Rules

- **Input:** always `pdfs/<filename>.pdf` (basename ties outputs together).
- **Output:** one JSON file per PDF per phase, named after the PDF stem.
- **Independence:** phase N does not read phase N−1 output unless we explicitly add an optional enrich step later. Default is parallel re-runnability.
- **Meta block:** phase JSON may include `_source` (filename, sha256, model, timestamps) for provenance; graph merge uses this.

## Phase 2 (current)

Header-level metadata: EPD number, program operator, producer, product name, declared unit, validity, PCR reference, verifier.

- Schema: `schemas/phase2_header.json`
- Script: `src/phase2_header.ts`
- Requires `ANTHROPIC_API_KEY` in `.env`

Run:

```bash
npx tsx src/phase2_header.ts pdfs/EPD-S-P-12345-EN.pdf
npx tsx src/phase2_header.ts --all
```

## Path to the knowledge graph

Phase JSON is the **source of truth for extraction**. A graph builder (not yet implemented) will:

1. Read completed phase files for a given EPD id.
2. Emit JSON-LD nodes and edges with stable IRIs.
3. Write to `data/graph/` (per-EPD file and/or merged corpus).

Details: [knowledge-graph.md](knowledge-graph.md).
