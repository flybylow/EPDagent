# Reference EPD corpus

Recorded 2026-05-26. Use this doc when tuning extraction, drafts, or verify.

## PDF folder

All production EPD PDFs live in:

```
data/EPD/
```

This is the **project default** (`DEFAULT_PDF_DIR`). No `EPDAGENT_PDF_DIR` needed unless PDFs move elsewhere.

Current files (2):

| File | Reference id |
|------|----------------|
| `B-EPD 21-0135-03-00-00-EN ETEX - natura ea - signed.pdf` | `etex-natura-ea` (**canonical**) |
| `B-EPD_023.0011.007-02.00.00 Rockwool Rockfit Mono EN - signed.pdf` | `rockwool-rockfit-mono` |

## Canonical comparison EPD — ETEX natura ea

**Use this file first** when checking draft vs PDF or iterating prompts.

| Field | Value |
|-------|--------|
| Reference id | `etex-natura-ea` |
| PDF | `data/EPD/B-EPD 21-0135-03-00-00-EN ETEX - natura ea - signed.pdf` |
| Stem (for `out/` filenames) | `B-EPD 21-0135-03-00-00-EN ETEX - natura ea - signed` |
| EPD number (from filename) | `21-0135-03-00-00` |
| Program | B-EPD (Belgian) |
| Producer | ETEX |
| Product | natura ea |
| Language | EN |

Machine-readable manifest: `data/reference/etex-natura-ea/manifest.json`  
Registry of all reference EPDs: `data/reference/index.json`

## Where outputs land (for comparison)

After **Extract PDF** or CLI phases, compare these paths for the ETEX file:

| Stage | Path |
|-------|------|
| Phase 1 | `out/phase1_filename/B-EPD 21-0135-03-00-00-EN ETEX - natura ea - signed.json` |
| Phase 2 | `out/phase2_header/…same stem….json` |
| Draft | `out/drafts/…same stem…/draft.json` |
| Graph | `data/graph/…same stem….jsonld` |
| Verify UI | `/epd/B-EPD%2021-0135-03-00-00-EN%20ETEX%20-%20natura%20ea%20-%20signed/verify` |

Filenames keep spaces — URLs must be encoded (the app handles this).

## Filename patterns

BEBD/B-EPD exports use different prefixes than demo fixtures (`EPD-S-P-*`):

- `B-EPD 21-0135-03-00-00-EN …` → phase 1 pattern `B-EPD`
- `B-EPD_023.0011.007-02.00.00 …` → phase 1 pattern `B-EPD_`

Phase 2 still reads the full PDF via Claude regardless of filename.

## Workflow

```bash
npm run dev
# Home → ETEX row (tag: reference) → Extract PDF → Verify
```

Or CLI on the canonical file:

```bash
npx tsx src/phase1_filename.ts "data/EPD/B-EPD 21-0135-03-00-00-EN ETEX - natura ea - signed.pdf"
npx tsx src/phase2_header.ts "data/EPD/B-EPD 21-0135-03-00-00-EN ETEX - natura ea - signed.pdf"
npm run drafts
```
