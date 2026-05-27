/**
 * Refresh §5 system-boundaries from PDF checkbox diagrams (all corpus PDFs, no API).
 */
import "dotenv/config";
import { refreshSystemBoundariesAll } from "../lib/extract/refresh-system-boundaries";

async function main() {
  const { ok, fail, rows } = await refreshSystemBoundariesAll();
  for (const { stem, status } of rows) {
    const label = stem.length > 50 ? `${stem.slice(0, 47)}…` : stem;
    console.log(`${status.startsWith("ok") ? "OK  " : "FAIL"} ${label.padEnd(50)} ${status}`);
  }
  console.log(`\n${ok} updated, ${fail} failed (${rows.length} PDFs)`);
  if (fail) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
