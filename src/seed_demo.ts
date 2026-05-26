/**
 * Copy demo fixtures into out/ and build the JSON-LD graph.
 *
 * Usage: npx tsx src/seed_demo.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";
import { FIXTURES_DIR, PHASE_DIRS } from "../lib/paths";

function copyFixtures(): void {
  if (!fs.existsSync(FIXTURES_DIR)) {
    console.error(`Fixtures not found: ${FIXTURES_DIR}`);
    process.exit(1);
  }

  for (const file of fs.readdirSync(FIXTURES_DIR)) {
    if (!file.endsWith(".json")) continue;
    const content = fs.readFileSync(path.join(FIXTURES_DIR, file), "utf-8");
    let destDir: string;
    if (file.includes(".phase1.")) {
      destDir = PHASE_DIRS.phase1;
    } else if (file.includes(".phase2.")) {
      destDir = PHASE_DIRS.phase2;
    } else {
      continue;
    }
    const stem = file.replace(/\.phase[12]\.json$/, "");
    fs.mkdirSync(destDir, { recursive: true });
    const dest = path.join(destDir, `${stem}.json`);
    fs.writeFileSync(dest, content);
    console.log(`fixture  ${file}  -> ${path.relative(process.cwd(), dest)}`);
  }
}

copyFixtures();
execSync("npx tsx src/build_graph.ts", { stdio: "inherit", cwd: process.cwd() });
execSync("npx tsx src/build_drafts.ts", { stdio: "inherit", cwd: process.cwd() });
console.log("\nDemo ready. Run: npm run dev");
