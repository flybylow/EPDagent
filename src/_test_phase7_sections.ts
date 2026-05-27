/**
 * Corpus check: §11.1 Indoor air narrative present in phase7 output.
 * Usage: npm run test:phase7-sections
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { pdfDir } from "../lib/paths";
import { loadPhase7 } from "../lib/data";
import { phase7BlockForSection } from "../lib/phase7-epd-sections-content";

let ok = 0;
let miss = 0;

for (const file of fs.readdirSync(pdfDir()).filter((f) => f.endsWith(".pdf")).sort()) {
  const stem = path.basename(file, path.extname(file));
  const data = loadPhase7(stem);
  const block = phase7BlockForSection(data, "11.1", "Indoor air");
  const has = Boolean(block?.content?.trim());
  if (has) ok++;
  else miss++;
  console.log(`${has ? "OK  " : "MISS"} ${stem}`);
}

console.log(`\n${ok} with §11.1 text, ${miss} missing (garbled PDF pages may need API phase7)`);
process.exitCode = miss > 0 ? 1 : 0;
