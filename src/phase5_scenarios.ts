/**
 * Phase 5: Lifecycle scenarios (§10)
 */
import * as fs from "node:fs";
import * as path from "node:path";
import "dotenv/config";
import { assertBulkApiAllowed, phase5CacheStatus } from "../lib/anthropic/guard";
import { runPhase5 } from "../lib/extract/phase5";
import { resolvePhase5PageSpec } from "../lib/extract/phase5-pages";
import { pdfDir, PHASE_DIRS } from "../lib/paths";

const OUT_DIR = PHASE_DIRS.phase5;

async function processPdf(pdfPath: string, force = false): Promise<void> {
  const stem = path.basename(pdfPath, path.extname(pdfPath));
  const outPath = path.join(OUT_DIR, `${stem}.json`);
  const cache = phase5CacheStatus(stem, pdfPath, force);

  console.log(`-> ${path.basename(pdfPath)} (pages ${resolvePhase5PageSpec(stem)})`);

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
    const result = await runPhase5(pdfPath, apiKey, { force });
    const src = result._source ?? {};
    console.log(
      `   ok  ${((Date.now() - start) / 1000).toFixed(1)}s  slice=${src.api_pdf_bytes}B  in=${src.input_tokens} out=${src.output_tokens}  scenarios=${result.scenarios.length}`
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
    console.error("Usage: phase5_scenarios.ts <pdf-path> | --all [--force]");
    process.exit(1);
  }
  const force = args.includes("--force");
  const positional = args.filter((a) => !a.startsWith("--"));
  const pdfs =
    positional[0] === "--all"
      ? (assertBulkApiAllowed(),
        fs.readdirSync(pdfDir()).filter((f) => f.toLowerCase().endsWith(".pdf")).map((f) => path.join(pdfDir(), f)))
      : [path.resolve(positional[0])];
  for (const pdf of pdfs) await processPdf(pdf, force);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
