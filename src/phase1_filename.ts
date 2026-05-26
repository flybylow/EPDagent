/**
 * Phase 1: Filename parse
 *
 * Usage:
 *   npx tsx src/phase1_filename.ts pdfs/EPD-S-P-12345-EN.pdf
 *   npx tsx src/phase1_filename.ts --all
 */

import * as fs from "node:fs";
import * as path from "node:path";
import "dotenv/config";
import { pdfDir, PHASE_DIRS } from "../lib/paths";
import { parseFilename } from "../lib/phase1/parse";
import { loadPhase1, loadPhase2 } from "../lib/data";
import { writeDraftOutputs } from "../lib/templates";

const OUT_DIR = PHASE_DIRS.phase1;

function processPdf(pdfPath: string): void {
  const filename = path.basename(pdfPath);
  const stem = path.basename(pdfPath, path.extname(pdfPath));
  const outPath = path.join(OUT_DIR, `${stem}.json`);

  console.log(`-> ${filename}`);
  const result = {
    ...parseFilename(filename),
    _source: {
      pdf_filename: filename,
      extracted_by: "filename-regex",
      extracted_at: new Date().toISOString(),
    },
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  writeDraftOutputs(stem, { phase1: loadPhase1(stem), phase2: loadPhase2(stem) });
  console.log(`   ok  pattern=${result.pattern} epd=${result.epd_number}  -> ${path.relative(process.cwd(), outPath)}`);
}

function main(): void {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Usage: phase1_filename.ts <pdf-path> | --all");
    process.exit(1);
  }

  let pdfs: string[];
  if (args[0] === "--all") {
    if (!fs.existsSync(pdfDir())) {
      console.error(`PDF directory not found: ${pdfDir()}`);
      process.exit(1);
    }
    pdfs = fs
      .readdirSync(pdfDir())
      .filter((f) => f.toLowerCase().endsWith(".pdf"))
      .map((f) => path.join(pdfDir(), f));
    console.log(`Found ${pdfs.length} PDFs in ${pdfDir()}`);
  } else {
    pdfs = [path.resolve(args[0])];
  }

  for (const pdf of pdfs) {
    processPdf(pdf);
  }
}

main();
