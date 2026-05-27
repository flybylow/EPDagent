/**
 * Phase 7: EPD sections 11–14 (additional env info, verification, application unit, reversibility)
 */
import * as fs from "node:fs";
import * as path from "node:path";
import "dotenv/config";
import { assertBulkApiAllowed, phase7CacheStatus } from "../lib/anthropic/guard";
import { runPhase7 } from "../lib/extract/phase7-epd-sections";
import { resolvePhase7PageSpec } from "../lib/extract/phase7-pages";
import { pdfDir, PHASE_DIRS } from "../lib/paths";

const OUT_DIR = PHASE_DIRS.phase7;

async function processPdf(
  pdfPath: string,
  force = false,
  pageSpec?: string
): Promise<void> {
  const stem = path.basename(pdfPath, path.extname(pdfPath));
  const cache = phase7CacheStatus(stem, pdfPath, force);
  const pages = pageSpec?.trim() || resolvePhase7PageSpec(stem);

  console.log(`-> ${path.basename(pdfPath)} (pages ${pages})`);

  if (cache.skip) {
    console.log(`   skip  ${cache.reason}  -> ${path.relative(process.cwd(), cache.outPath)}`);
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim() || undefined;
  const start = Date.now();
  try {
    const result = await runPhase7(pdfPath, apiKey, { force, pageSpec: pages || undefined });
    const src = result._source ?? {};
    const mode = apiKey ? "api+pdf-text" : "pdf-text";
    console.log(
      `   ok  ${((Date.now() - start) / 1000).toFixed(1)}s  ${mode}  blocks=${result.blocks.length}  in=${src.input_tokens ?? 0} out=${src.output_tokens ?? 0}`
    );
    for (const b of result.blocks) {
      console.log(`       ${b.number ?? "—"}  ${b.title ?? ""}`);
    }
  } catch (err) {
    console.error(`   fail ${(err as Error).message}`);
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(
      path.join(OUT_DIR, `${stem}.error.json`),
      JSON.stringify({ error: (err as Error).message, attempted_at: new Date().toISOString() }, null, 2)
    );
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Usage: phase7_epd_sections.ts <pdf-path> | --all [--force]");
    process.exit(1);
  }
  const force = args.includes("--force");
  const pagesIdx = args.indexOf("--pages");
  const pageSpec = pagesIdx >= 0 ? args[pagesIdx + 1] : undefined;
  const positional = args.filter(
    (a, i) => !a.startsWith("--") && i !== pagesIdx + 1 && a !== "--pages"
  );
  const pdfs =
    positional[0] === "--all"
      ? (assertBulkApiAllowed(),
        fs.readdirSync(pdfDir()).filter((f) => f.toLowerCase().endsWith(".pdf")).map((f) => path.join(pdfDir(), f)))
      : [path.resolve(positional[0])];
  for (const pdf of pdfs) await processPdf(pdf, force, pageSpec);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
