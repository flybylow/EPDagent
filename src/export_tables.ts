/**
 * Export PDF pages containing EPD tables as PNGs for visual verify.
 *
 * Usage:
 *   npm run export-tables -- "data/EPD/foo.pdf"
 */

import * as path from "node:path";
import "dotenv/config";
import { pdfStem } from "../lib/paths";
import { tableRegistryForStem } from "../lib/tables/manifest";
import { exportTablePages } from "../lib/tables/export-pages";

async function main(): Promise<void> {
  const arg = process.argv[2];
  if (!arg) {
    console.error("Usage: export_tables.ts <pdf-path>");
    process.exit(1);
  }

  const pdfPath = path.isAbsolute(arg) ? arg : path.resolve(arg);
  const stem = pdfStem(path.basename(pdfPath));
  const tables = tableRegistryForStem(stem);

  if (tables.length === 0) {
    console.error(`No table registry for stem: ${stem}`);
    console.error("Add data/reference/<id>/tables.json");
    process.exit(1);
  }

  console.log(`-> ${path.basename(pdfPath)} (${tables.length} tables)`);
  const manifest = await exportTablePages(pdfPath, stem, tables);

  for (const t of manifest.tables) {
    console.log(`   ${t.id}  page ${t.page}  ${t.imageBytes}B  -> ${t.image}`);
  }
  console.log(`   manifest -> out/table_exports/${stem}/manifest.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
