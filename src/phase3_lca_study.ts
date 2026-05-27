/**
 * Phase 3 LCA study: methodology and representativeness (section 3)
 */
import * as fs from "node:fs";
import * as path from "node:path";
import "dotenv/config";
import { assertBulkApiAllowed, phase3LcaStudyCacheStatus } from "../lib/anthropic/guard";
import { refreshSystemBoundariesForStem } from "../lib/extract/refresh-system-boundaries";
import { runPhase3LcaStudy } from "../lib/extract/phase3-lca-study";
import { resolvePhase3LcaStudyPageSpec } from "../lib/extract/phase3-lca-study-pages";
import { pdfDir, PHASE_DIRS } from "../lib/paths";

const OUT_DIR = PHASE_DIRS.phase3_lca_study;

async function processPdf(
  pdfPath: string,
  force = false,
  boundariesOnly = false
): Promise<void> {
  const stem = path.basename(pdfPath, path.extname(pdfPath));
  const outPath = path.join(OUT_DIR, `${stem}.json`);

  if (boundariesOnly) {
    console.log(`-> ${path.basename(pdfPath)} (§5 diagram only)`);
    const r = await refreshSystemBoundariesForStem(stem);
    console.log(r.ok ? `   ok  ${r.reason}` : `   fail ${r.reason}`);
    return;
  }

  const cache = phase3LcaStudyCacheStatus(stem, pdfPath, force);

  console.log(`-> ${path.basename(pdfPath)} (pages ${resolvePhase3LcaStudyPageSpec(stem)})`);

  if (cache.skip) {
    console.log(`   skip  ${cache.reason}  -> ${path.relative(process.cwd(), cache.outPath)}`);
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("   fail ANTHROPIC_API_KEY is required");
    process.exit(1);
  }

  const start = Date.now();
  try {
    const result = await runPhase3LcaStudy(pdfPath, apiKey, { force });
    const src = result._source ?? {};
    console.log(
      `   ok  ${((Date.now() - start) / 1000).toFixed(1)}s  slice=${src.api_pdf_bytes}B  in=${src.input_tokens} out=${src.output_tokens}`
    );
  } catch (err) {
    console.error(`   fail ${(err as Error).message}`);
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(
      outPath.replace(/\.json$/, ".error.json"),
      JSON.stringify({ error: (err as Error).message, attempted_at: new Date().toISOString() }, null, 2)
    );
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Usage: phase3_lca_study.ts <pdf-path> | --all [--force]");
    process.exit(1);
  }
  const force = args.includes("--force");
  const boundariesOnly = args.includes("--boundaries-only");
  const positional = args.filter((a) => !a.startsWith("--"));
  let pdfs: string[];
  if (positional[0] === "--all") {
    if (!boundariesOnly) assertBulkApiAllowed();
    pdfs = fs
      .readdirSync(pdfDir())
      .filter((f) => f.toLowerCase().endsWith(".pdf"))
      .map((f) => path.join(pdfDir(), f));
  } else {
    pdfs = [path.resolve(positional[0])];
  }
  for (const pdf of pdfs) await processPdf(pdf, force, boundariesOnly);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
