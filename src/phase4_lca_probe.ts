/**
 * Phase 4 probe: high-level LCA table capture test (rotated headers)
 *
 * Usage:
 *   npm run phase4-probe -- "data/EPD/foo.pdf"
 *   npm run phase4-probe -- "data/EPD/foo.pdf" --pages 8
 *   npm run phase4-probe -- "data/EPD/foo.pdf" --force
 */
import * as fs from "node:fs";
import * as path from "node:path";
import "dotenv/config";
import { assertBulkApiAllowed } from "../lib/anthropic/guard";
import { runPhase4Probe } from "../lib/extract/phase4-probe";
import { phase4ProbeOutputPath } from "../lib/extract/phase4-probe-path";
import { resolvePhase4PageSpec } from "../lib/extract/phase4-pages";
import { pdfDir, OUT_DIR } from "../lib/paths";

const PROBE_DIR = path.join(OUT_DIR, "phase4_lca_probe");

function parsePagesArg(args: string[]): string | undefined {
  const idx = args.indexOf("--pages");
  if (idx === -1 || !args[idx + 1]) return undefined;
  return args[idx + 1];
}

async function processPdf(
  pdfPath: string,
  force = false,
  pageSpec?: string
): Promise<void> {
  const stem = path.basename(pdfPath, path.extname(pdfPath));
  const resolvedPages = pageSpec ?? resolvePhase4PageSpec(stem);
  const outPath = phase4ProbeOutputPath(stem, resolvedPages);

  console.log(`-> ${path.basename(pdfPath)} (pages ${resolvedPages})`);

  if (!force && fs.existsSync(outPath)) {
    const cached = JSON.parse(fs.readFileSync(outPath, "utf-8")) as {
      _source?: { api_pages?: string };
    };
    if (cached._source?.api_pages === resolvedPages) {
      console.log(`   skip  cached probe exists (use --force to re-extract)`);
      return;
    }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("   fail ANTHROPIC_API_KEY is required");
    process.exit(1);
  }

  const start = Date.now();
  try {
    const result = await runPhase4Probe(pdfPath, apiKey, { force, pageSpec: resolvedPages });
    const src = result._source ?? {};
    const firstRow = result.rows[0];
    const sample =
      firstRow?.values?.slice(0, 3).map((v) => `${v.column_code}=${v.raw_value}`).join(" ") ??
      "—";
    console.log(
      `   ok  ${((Date.now() - start) / 1000).toFixed(1)}s  slice=${src.api_pdf_bytes}B  in=${src.input_tokens} out=${src.output_tokens}`
    );
    console.log(
      `       cols=${result.columns.length} rows=${result.rows.length} complete=${result.capture?.complete} rotated=${result.capture?.headers_rotated}`
    );
    console.log(`       title: ${result.table_title ?? "—"}`);
    if (sample !== "—") console.log(`       sample row: ${firstRow?.indicator} → ${sample}…`);
    if (result.capture?.notes) console.log(`       notes: ${result.capture.notes}`);
    console.log(`       -> ${path.relative(process.cwd(), outPath)}`);
  } catch (err) {
    console.error(`   fail ${(err as Error).message}`);
    fs.mkdirSync(PROBE_DIR, { recursive: true });
    fs.writeFileSync(
      outPath.replace(/\.json$/, ".error.json"),
      JSON.stringify({ error: (err as Error).message, attempted_at: new Date().toISOString() }, null, 2)
    );
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Usage: phase4_lca_probe.ts <pdf-path> [--pages N] [--force]");
    process.exit(1);
  }
  const force = args.includes("--force");
  const pageSpec = parsePagesArg(args);
  const positional = args.filter((a) => !a.startsWith("--") && a !== pageSpec);
  const pdfs =
    positional[0] === "--all"
      ? (assertBulkApiAllowed(),
        fs
          .readdirSync(pdfDir())
          .filter((f) => f.toLowerCase().endsWith(".pdf"))
          .map((f) => path.join(pdfDir(), f)))
      : [path.resolve(positional[0])];
  for (const pdf of pdfs) await processPdf(pdf, force, pageSpec);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
