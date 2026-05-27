/**
 * Gap inventory: sections with PDF but no structured data.
 *
 *   npm run gap-report              # all EPDs with PDF
 *   npm run gap-report -- <stem>    # one EPD, write snapshot
 *   npm run gap-report -- lock <stem> <sectionId> accepted "why we accept this gap"
 */
import "dotenv/config";
import { buildGapReport, diffGapSnapshots, readGapSnapshot, writeGapSnapshot } from "../lib/extract/gap-report";
import { gapLockPath, saveGapLock } from "../lib/extract/gap-lock";
import { listEpdRecords } from "../lib/data";

const args = process.argv.slice(2);

async function main() {
  if (args[0] === "lock" && args.length >= 4) {
    const [, stem, sectionId, status, ...noteParts] = args;
    if (status !== "open" && status !== "accepted" && status !== "fixed") {
      console.error("Status must be open, accepted, or fixed");
      process.exit(1);
    }
    const file = saveGapLock(stem, sectionId, status, noteParts.join(" ").trim() || undefined);
    console.log(`Locked ${sectionId} → ${status} in ${file}`);
    return;
  }

  const stemArg = args.find((a) => !a.startsWith("-"));
  const records = stemArg
    ? listEpdRecords().filter((r) => r.stem === stemArg || r.stem.includes(stemArg))
    : listEpdRecords().filter((r) => r.hasPdf);

  if (stemArg && !records.length) {
    console.error(`No EPD matching ${stemArg}`);
    process.exit(1);
  }

  for (const record of records) {
    const report = buildGapReport(record.stem);
    const prev = readGapSnapshot(record.stem);
    const path = writeGapSnapshot(report);
    const name =
      record.phase2?.product_name ?? record.phase1?.epd_number ?? record.stem;

    console.log(`\n=== ${name} ===`);
    console.log(
      `gaps=${report.summary.gaps} open=${report.summary.open} accepted=${report.summary.accepted} fixed=${report.summary.fixed} · snapshot ${path}`
    );
    console.log(`locks: ${gapLockPath(record.stem)}`);

    if (Object.keys(report.summary.byReason).length) {
      console.log("by reason:", report.summary.byReason);
    }

    if (prev && prev.generatedAt !== report.generatedAt) {
      const delta = diffGapSnapshots(prev, report);
      if (delta.resolved.length || delta.newGaps.length) {
        console.log(
          `delta vs last run: ${delta.resolved.length} resolved, ${delta.newGaps.length} new, open ${delta.openDelta >= 0 ? "+" : ""}${delta.openDelta}`
        );
      }
    }

    if (stemArg || report.summary.open <= 12) {
      for (const g of report.gaps.filter((x) => x.lockStatus === "open")) {
        console.log(
          `  [${g.gapReason}] §${g.number} p${g.page ?? "?"} ${g.title}${g.phaseId ? ` → ${g.phaseId}` : ""}`
        );
        if (g.pendingMessage) console.log(`    ${g.pendingMessage}`);
      }
    } else if (report.summary.open > 12) {
      console.log(`  (${report.summary.open} open gaps — re-run with full stem to list all)`);
    }
  }
}

main().catch((err) => {
  console.error((err as Error).message);
  process.exit(1);
});
