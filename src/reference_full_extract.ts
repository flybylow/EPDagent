/**
 * Full reference EPD extraction test — run all phases and emit a section coverage report.
 *
 * Usage:
 *   npm run reference-extract -- rockwool-rockfit-mono
 *   npm run reference-extract -- rockwool-rockfit-mono --force
 */
import * as fs from "node:fs";
import * as path from "node:path";
import "dotenv/config";
import {
  buildReferenceCoverageReport,
  writeReferenceCoverageReport,
} from "../lib/extract/coverage-report";
import { runFullExtractForStem } from "../lib/extract/full-extract";
import { logExtractProgress } from "../lib/extract/progress";
import { listReferenceEpds } from "../lib/reference";
import { pdfDir } from "../lib/paths";

function resolveReference(idOrStem: string) {
  const refs = listReferenceEpds();
  const byId = refs.find((r) => r.id === idOrStem);
  if (byId) return byId;
  const byStem = refs.find((r) => r.stem === idOrStem);
  if (byStem) return byStem;
  const pdfPath = path.isAbsolute(idOrStem)
    ? idOrStem
    : path.join(pdfDir(), idOrStem.endsWith(".pdf") ? idOrStem : `${idOrStem}.pdf`);
  if (!fs.existsSync(pdfPath)) {
    throw new Error(`Unknown reference: ${idOrStem}`);
  }
  const stem = path.basename(pdfPath, path.extname(pdfPath));
  return { id: null as string | null, stem, pdfFile: path.basename(pdfPath) };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2).filter((a) => a !== "--");
  if (!args.length) {
    console.error("Usage: reference_full_extract.ts <reference-id|stem> [--force]");
    process.exit(1);
  }

  const force = args.includes("--force");
  const target = args.find((a) => !a.startsWith("--"));
  if (!target) {
    console.error("Missing reference id or stem");
    process.exit(1);
  }

  const ref = resolveReference(target);

  console.log(`\n=== Reference full extract: ${ref.id ?? ref.stem} ===\n`);
  console.log(`PDF: ${path.join(pdfDir(), ref.pdfFile ?? `${ref.stem}.pdf`)}\n`);
  console.log(`force=${force}\n`);

  const result = await runFullExtractForStem(ref.stem, {
    force,
    exportTables: true,
    onProgress: logExtractProgress,
  });
  for (const step of result.steps) {
    console.log(`  ${step.ok ? "ok" : "FAIL"}  ${step.id}${step.error ? ` — ${step.error}` : ""}`);
  }

  const report = buildReferenceCoverageReport(ref.stem, { referenceId: ref.id });
  const outPath = writeReferenceCoverageReport(report);

  console.log("\n=== Coverage summary ===");
  console.log(
    `  ready=${report.summary.ready}  visual_only=${report.summary.visual_only}  pending=${report.summary.pending}  pdf_links=${report.summary.withPdf}`
  );
  console.log(`  report -> ${path.relative(process.cwd(), outPath)}`);

  const pending = report.sections.filter((s) => s.status === "pending");
  if (pending.length) {
    console.log("\nPending sections:");
    for (const s of pending.slice(0, 12)) {
      console.log(`  ${s.number} ${s.title} (p${s.page ?? "?"})`);
    }
    if (pending.length > 12) console.log(`  … and ${pending.length - 12} more`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
