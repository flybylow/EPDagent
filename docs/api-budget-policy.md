# Anthropic API budget policy

**Read this before any Claude API call** (phase 2 extraction, Extract PDF with phase 2, AI verify). Agents and humans should follow it to avoid burning credits on repeats or bulk runs.

Last updated: 2026-05-26

## API touchpoints in this repo

| Call site | Trigger | Sends | Output cap |
|-----------|---------|-------|------------|
| `lib/extract/phase2.ts` | Extract PDF (UI/API), `npm run phase2` | **Page slice only** (default pages 1–4) | `max_tokens: 2048` |
| `lib/verify/run.ts` | POST `/api/verify/[stem]`, verify UI | **Full PDF** + draft field JSON | `max_tokens: 4096` |

Model everywhere: `claude-sonnet-4-5`.

## Phase 2 flow (page-limited)

```
data/EPD/<stem>.pdf          full source (never sent whole to API)
        │
        ▼
lib/pdf/pages.ts             slice pages (default 1–4 via pdf-lib)
        │
        ├──► out/pdf_slices/<stem>.p1-4.pdf   exported excerpt (inspect / reuse)
        │
        ▼
Claude API                   base64 slice only
        │
        ▼
out/phase2_header/<stem>.json   _source records api_pages, api_pdf_bytes, full pdf_sha256
```

Header fields (EPD number, producer, validity, PCR, verifier) live on the first pages of BEBD EPDs. Later phases (LCA tables, scenarios) will use **different page ranges** — same slice machinery, different env vars when implemented.

## Cost drivers

1. **Input size** — Phase 2 sends only `EPDAGENT_PHASE2_PAGES` (default `1-4`), not the full ~850 KB PDF. Slices are typically tens of KB.
2. **Call count** — `--all`, re-clicking Extract, or re-running verify multiplies cost linearly.
3. **Verify still uses full PDF** — defer verify until phase 2 output is reviewed.

## Default policy (mandatory)

### Before calling the API

1. **Confirm billing** — Anthropic account has credits ([Plans & Billing](https://console.anthropic.com/settings/billing)).
2. **Confirm intent** — State which EPD stem(s) and which operation (phase 2 only vs verify).
3. **Prefer cache** — If `out/phase2_header/<stem>.json` exists, `_source.pdf_sha256` matches the PDF, and `_source.api_pages` matches `EPDAGENT_PHASE2_PAGES`, **do not call** unless `--force`.
4. **One PDF first** — Never start with `--all`. Use the canonical reference EPD first (see [reference-epd-corpus.md](reference-epd-corpus.md)).
5. **Separate phase 2 and verify** — Do not run verify in the same session until phase 2 output is reviewed.

### Canonical first test

```bash
npm run phase2 -- "data/EPD/B-EPD 21-0135-03-00-00-EN ETEX - natura ea - signed.pdf"
```

- **Expected calls:** 1
- **Expected upload:** pages 1–4 slice only (~tens of KB, not full PDF)
- **Check:** `out/pdf_slices/` for exported excerpt, `_source.api_pdf_bytes` in output JSON

### Hard limits

| Limit | Value | Rationale |
|-------|-------|-----------|
| Phase 2 pages | `1-4` (`EPDAGENT_PHASE2_PAGES`) | Header-only excerpt |
| Max API payload | 1 MB (`EPDAGENT_MAX_API_PDF_BYTES`) | Block oversized slices before API |
| Max source PDF | 5 MB (`EPDAGENT_MAX_PDF_BYTES`) | Reject corrupt/huge inputs early |
| Bulk `--all` | Requires `EPDAGENT_ALLOW_BULK_API=1` | Prevents accidental corpus-wide spend |
| Re-extract | Requires `--force` if valid cached JSON exists | Avoid duplicate billing |

### Agent checklist (repeat every session)

- [ ] Read this file
- [ ] Read [reference-epd-corpus.md](reference-epd-corpus.md) for which PDF to test
- [ ] Check `out/phase2_header/` for existing output / `.error.json`
- [ ] Confirm `EPDAGENT_PHASE2_PAGES` with user if headers might be on other pages
- [ ] Agree on **exact command** and **call count** before executing
- [ ] After one call, report `api_pdf_bytes`, `input_tokens`, `output_tokens` from `_source`

## Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `ANTHROPIC_API_KEY` | — | Required for phase 2 and verify |
| `EPDAGENT_PHASE2_PAGES` | `1-4` | 1-based inclusive pages sent to Claude |
| `EPDAGENT_MAX_API_PDF_BYTES` | `1048576` (1 MB) | Max size of slice uploaded to API |
| `EPDAGENT_MAX_PDF_BYTES` | `5242880` (5 MB) | Max size of source PDF on disk |
| `EPDAGENT_ALLOW_BULK_API` | unset | Must be `1` for `phase2 --all` |

## Related docs

- [local-dev.md](local-dev.md) — scripts and `.env`
- [reference-epd-corpus.md](reference-epd-corpus.md) — canonical ETEX test file
- [drafts-and-verification.md](drafts-and-verification.md) — verify flow (still full PDF)
