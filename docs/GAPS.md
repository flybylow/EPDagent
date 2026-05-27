# Section gaps and gap locks

Section **gaps** are docmap sections that have a PDF anchor but no structured extract and no visual-only table export. They are the same count as **N gaps** on corpus cards and the section nav.

## Two layers

| Layer | Path | Purpose |
|-------|------|---------|
| **Snapshot** (auto) | `out/gap_reports/<stem>.json` | Full gap list after each full extract; `gapReason` hints which pipeline area to fix |
| **Locks** (manual) | `data/gap-locks/<stem>.json` | Mark gaps as `accepted` (known limitation) or `fixed` (verified in a later run) |

Snapshots are regenerated; locks persist in git so the team records what is intentional vs what still needs algorithm work.

## Gap reasons (`gapReason`)

Rough mapping to work areas:

- `phase4_probe` — LCA table / probe pages
- `phase7_narrative` — narrative EPD sections
- `phase5_scenarios` / `phase6_refs` — scenarios or references phase
- `phase3_extract` — product / composition / LCA study blocks
- `phase2_header` — header / metadata
- `pipeline_pending` — docmap or step not run yet
- `no_mapping` — no section-view template for this TOC entry
- `visual_only` — PNG/table export only (not counted as a gap in nav stats)
- `phase_empty` — phase bound but output empty

Use `pendingMessage` on each row for the exact UI string.

## In the app

- **Dashboard:** click **N gaps** on a card → EPD page with gap panel and **Gaps only** nav filter.
- **EPD page:** **Open gaps** panel (above section nav) — grouped by fix type, **Open** jumps to the section, **Accept** / **Fixed** updates `data/gap-locks/`.
- **Section nav:** **Gaps only** checkbox (same filter as the panel’s “Show in nav”).

After extract, refresh the page to reload the gap list (or use **Refresh** in the panel).

## Commands

```bash
# All PDFs: summary + refresh snapshots
npm run gap-report

# One EPD: list open gaps + snapshot
npm run gap-report -- "B-EPD-..."

# Lock a gap (accepted = known OK, fixed = resolved and checked)
npm run gap-report -- lock "B-EPD-..." "3~p7" accepted "duplicate TOC; maps to wrong page"
```

After **Run missing steps**, `lib/extract/full-extract.ts` writes a new snapshot automatically. Compare two runs with the delta line in the CLI output (resolved / new / open count change).

## Workflow for algorithm changes

1. Run extract (or `npm run gap-report -- <stem>`).
2. For each real bug, leave status `open` and note `gapReason`.
3. For known PDF/layout limits, `lock … accepted` with a short note.
4. Change extract/docmap/section-view code.
5. Re-run extract; confirm `resolved` in CLI delta and move locks to `fixed` when verified.

Commit `data/gap-locks/*.json` for reference EPDs you use as regression anchors.
