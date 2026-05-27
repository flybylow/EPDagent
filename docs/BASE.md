# Knowledge base conventions

Internal project knowledge lives in `docs/`. The repo root stays minimal: app config, source folders, and a single `README.md` for quick start.

## Purpose

Capture durable facts that are easy to lose in chat: BEBD PDF quirks, schema decisions, JSON-LD mapping choices, prompt baselines, and “why we did X”. The README stays short; depth lives here.

## File naming

- Topic notes: `kebab-case.md` (e.g. `phase2-header.md`, `knowledge-graph.md`).
- Time-ordered snapshots: `YYYY-MM-DD-short-topic.md` when date order matters (prompt baselines, migration notes).

## Index rule

Whenever you add, rename, or remove a file under `docs/`, update [`INDEX.md`](INDEX.md) in the same change: link, one-line summary, optional date.

## Anthropic API

Before running phase 2, Extract PDF (with phase 2), or AI verify, **read [`api-budget-policy.md`](api-budget-policy.md)** and agree call count with the user. Do not run `phase2 --all` or verify without explicit approval.

## Stack direction (living contract)

- **App:** Next.js (UI, API routes, future graph explorer).
- **Extraction:** Node / TypeScript CLI phases — independent, schema-first JSON per PDF.
- **Knowledge graph:** JSON-LD node graphs built on open standards (not a proprietary graph format).
- **Contracts:** Phase JSON schemas are the extraction contract; JSON-LD is the publication / linking layer.
- **PDF corpus:** `data/EPD/` (default folder). Reference EPDs registered in `data/reference/index.json` — see [reference-epd-corpus.md](reference-epd-corpus.md).
- **Deploy:** Extract locally; Vercel domain serves committed `out/` slices + `data/graph/` for Tabulas — see [vercel-deploy.md](vercel-deploy.md).

## Docmap (section index / nav menu)

- **TOC parser** runs on pages 2–3; many B-EPD PDFs have no table of contents.
- **Heading scan** (`pdf-heading-scan`) is the backup: ALL-CAPS EN 15804 headings across the full PDF (`lib/extract/docmap-heading-scan.ts`), invoked from `extractDocmap()` when TOC returns 0 entries.
- **Empty docmap files** (0 `flat_entries`) must not count as “done”: extract skip uses `docmapIsCached` (entry count &gt; 0), not mere file existence.
- **EPD page load** calls `ensureDocmapForStem()` when a PDF exists but the index is missing/empty — builds the menu without manual `npm run docmap`.
- **Phase 7 narrative** (`§11.1` indoor air, §12 verification, §13 scenario development, §14 application unit, etc.): `phase7-text-parse` extracts text between PDF headings (no API). Headings without a printed section number (common on ETEX/Cedral) are anchored via docmap page + title. Docmap entries mislabeled as `11 · INDOOR AIR` are normalized to `11.1`. §13 “Additional technical information for scenario development” is phase 7 (not phase 5 §10). EPD page load runs `ensurePhase7ForStem()` when narrative is missing. Bulk: `npm run refresh:phase7-text`; check: `npm run test:phase7-sections`.

Extend this file when project-wide conventions change.
