/**
 * Extract all LCA tables for an EPD (one probe per registered page).
 *
 * Usage:
 *   npm run phase4-lca -- "data/EPD/foo.pdf"
 *   npm run phase4-lca -- "data/EPD/foo.pdf" --force
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { spawnSync } from "node:child_process";
import "dotenv/config";
import { pdfDir } from "../lib/paths";
import { tableRegistryForStem } from "../lib/tables/manifest";
import { probePageSpecForTable } from "../lib/tables/probe-pages";

function runProbe(pdfPath: string, pageSpec: string, force: boolean): void {
  const cmd = process.platform === "win32" ? "npm.cmd" : "npm";
  const args = ["run", "phase4-probe", "--", pdfPath, "--pages", pageSpec];
  if (force) args.push("--force");
  const result = spawnSync(cmd, args, { stdio: "inherit", cwd: process.cwd(), env: process.env });
  if (result.status !== 0) {
    throw new Error(`phase4-probe failed for pages ${pageSpec} (exit ${result.status})`);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2).filter((a) => a !== "--");
  const force = args.includes("--force");
  const positional = args.filter((a) => !a.startsWith("--"));
  if (!positional.length) {
    console.error("Usage: phase4_lca_all.ts <pdf-path> [--force]");
    process.exit(1);
  }

  const pdfPath = path.isAbsolute(positional[0])
    ? positional[0]
    : path.resolve(positional[0]);
  if (!fs.existsSync(pdfPath)) {
    console.error(`PDF not found: ${pdfPath}`);
    process.exit(1);
  }

  const stem = path.basename(pdfPath, path.extname(pdfPath));
  const lcaTables = tableRegistryForStem(stem).filter((t) => t.phase === "phase4_lca");

  if (!lcaTables.length) {
    console.error(`No phase4_lca tables in registry for: ${stem}`);
    console.error("Add entries to data/reference/<id>/tables.json");
    process.exit(1);
  }

  console.log(`\n=== LCA table extraction: ${path.basename(pdfPath)} ===`);
  console.log(
    `Tables: ${lcaTables.map((t) => `${t.id} (probe ${probePageSpecForTable(t)})`).join(", ")}\n`
  );

  for (const table of lcaTables) {
    console.log(`--- ${table.id} · ${table.title} ---`);
    runProbe(pdfPath, probePageSpecForTable(table), force);
  }

  console.log("\nDone. Outputs in out/phase4_lca_probe/");
  console.log("Optional PNG exports: npm run export-tables --", pdfPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
