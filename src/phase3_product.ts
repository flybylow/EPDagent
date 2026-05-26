/**
 * Phase 3: Product identification (§1 + §2 technical data)
 *
 * Usage:
 *   npm run phase3 -- data/EPD/foo.pdf
 *   npm run phase3 -- --all [--force]
 */

import * as fs from "node:fs";
import * as path from "node:path";
import "dotenv/config";
import { assertBulkApiAllowed, phase3CacheStatus } from "../lib/anthropic/guard";
import { runPhase3 } from "../lib/extract/phase3";
import { resolvePhase3PageSpec } from "../lib/extract/phase3-pages";
import { pdfDir, PHASE_DIRS } from "../lib/paths";

const OUT_DIR = PHASE_DIRS.phase3;

async function processPdf(pdfPath: string, force = false): Promise<void> {
  const stem = path.basename(pdfPath, path.extname(pdfPath));
  const outPath = path.join(OUT_DIR, `${stem}.json`);
  const cache = phase3CacheStatus(stem, pdfPath, force);

  console.log(`-> ${path.basename(pdfPath)} (pages ${resolvePhase3PageSpec(stem)})`);

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
    const result = await runPhase3(pdfPath, apiKey, { force });
    const src = result._source ?? {};
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(
      `   ok  ${elapsed}s  slice=${src.api_pdf_bytes}B  in=${src.input_tokens} out=${src.output_tokens}  -> ${path.relative(process.cwd(), outPath)}`
    );
    if (src.api_pdf_slice) {
      console.log(`       slice saved: ${src.api_pdf_slice}`);
    }
    const tech = result.technical_properties?.length ?? 0;
    console.log(`       technical_properties=${tech}  rsl=${result.reference_service_life_years ?? "—"}y`);
  } catch (err) {
    console.error(`   fail ${(err as Error).message}`);
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(
      outPath.replace(/\.json$/, ".error.json"),
      JSON.stringify(
        {
          error: (err as Error).message,
          pdf_filename: path.basename(pdfPath),
          api_pages: resolvePhase3PageSpec(stem),
          attempted_at: new Date().toISOString(),
        },
        null,
        2
      )
    );
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Usage: phase3_product.ts <pdf-path> | --all [--force]");
    process.exit(1);
  }

  const force = args.includes("--force");
  const positional = args.filter((a) => !a.startsWith("--"));

  let pdfs: string[];
  if (positional[0] === "--all") {
    assertBulkApiAllowed();
    pdfs = fs
      .readdirSync(pdfDir())
      .filter((f) => f.toLowerCase().endsWith(".pdf"))
      .map((f) => path.join(pdfDir(), f));
    console.log(`Found ${pdfs.length} PDFs in ${pdfDir()}`);
  } else {
    pdfs = [path.resolve(positional[0])];
  }

  for (const pdf of pdfs) {
    await processPdf(pdf, force);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
