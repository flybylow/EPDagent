/**
 * Phase docmap: extract table of contents / index tree from PDF text layer.
 *
 * Usage:
 *   npx tsx src/phase_docmap.ts <pdf-path> | --all
 */

import * as fs from "node:fs";
import * as path from "node:path";
import "dotenv/config";
import { writeDocmap } from "../lib/extract/docmap";
import { pdfDir } from "../lib/paths";

function printTree(nodes: import("../lib/extract/docmap-parse").TocNode[], indent = 0): void {
  for (const node of nodes) {
    const pad = "  ".repeat(indent);
    const page = node.page != null ? ` → p${node.page}` : "";
    console.log(`${pad}${node.number} ${node.title}${page}`);
    if (node.children?.length) printTree(node.children, indent + 1);
  }
}

async function processPdf(pdfPath: string): Promise<void> {
  const filename = path.basename(pdfPath);
  console.log(`-> ${filename}`);

  const outPath = await writeDocmap(pdfPath);
  const result = JSON.parse(fs.readFileSync(outPath, "utf-8")) as Awaited<
    ReturnType<typeof import("../lib/extract/docmap").extractDocmap>
  >;

  console.log(
    `   ok  pages=${result.source_pages.join(",")} source=${result._source.page_spec_source} entries=${result._source.entry_count}  -> ${path.relative(process.cwd(), outPath)}`
  );
  console.log("");
  printTree(result.entries);
  console.log("");
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Usage: phase_docmap.ts <pdf-path> | --all");
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
    await processPdf(pdf);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
