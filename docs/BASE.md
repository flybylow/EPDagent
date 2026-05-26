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

Extend this file when project-wide conventions change.
