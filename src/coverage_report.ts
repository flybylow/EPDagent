/**
 * Print section coverage for reference EPDs.
 * Usage: npm run coverage-report
 */
import "dotenv/config";
import { buildReferenceCoverageReport } from "../lib/extract/coverage-report";
import { listReferenceEpds } from "../lib/reference";

for (const ref of listReferenceEpds()) {
  const report = buildReferenceCoverageReport(ref.stem, { referenceId: ref.id });
  console.log(`\n=== ${ref.id} ===`);
  console.log(
    `ready=${report.summary.ready} visual_only=${report.summary.visual_only} pending=${report.summary.pending}`
  );
  const pending = report.sections.filter((s) => s.status === "pending");
  if (pending.length) {
    for (const s of pending) {
      console.log(`  pending  ${s.number} ${s.title}`);
    }
  }
}
