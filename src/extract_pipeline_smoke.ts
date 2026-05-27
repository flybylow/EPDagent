/**
 * Smoke test: reference manifests, cache skip vs force, and LCA study output presence.
 * No API calls. Run: npm run extract-smoke
 */
import * as fs from "node:fs";
import * as path from "node:path";
import {
  phase3LcaStudyCacheStatus,
} from "../lib/anthropic/guard";
import { resolvePhase3LcaStudyPageSpec } from "../lib/extract/phase3-lca-study-pages";
import { phase3LcaStudyHasContent } from "../lib/phase3-lca-study-content";
import { PHASE_DIRS } from "../lib/paths";
import { listReferenceEpds } from "../lib/reference";
import { pdfDir } from "../lib/paths";
import type { Phase3LcaStudyData } from "../lib/types";

function loadLcaStudy(stem: string): Phase3LcaStudyData | null {
  const p = path.join(PHASE_DIRS.phase3_lca_study, `${stem}.json`);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf-8")) as Phase3LcaStudyData;
}

function fail(msg: string): never {
  console.error(`FAIL  ${msg}`);
  process.exit(1);
}

function main(): void {
  const refs = listReferenceEpds();
  if (refs.length < 2) fail("expected at least 2 reference EPDs");

  let failures = 0;

  for (const ref of refs) {
    const pdfPath = path.join(pdfDir(), ref.pdfFile ?? `${ref.stem}.pdf`);
    if (!fs.existsSync(pdfPath)) {
      console.warn(`WARN  ${ref.id}: PDF missing at ${pdfPath}`);
      failures++;
      continue;
    }

    const pages = resolvePhase3LcaStudyPageSpec(ref.stem);
    const cached = phase3LcaStudyCacheStatus(ref.stem, pdfPath, false);
    const forced = phase3LcaStudyCacheStatus(ref.stem, pdfPath, true);
    const data = loadLcaStudy(ref.stem);
    const hasContent = phase3LcaStudyHasContent(data);

    console.log(`\n${ref.id ?? ref.stem}`);
    console.log(`  phase3LcaStudyPages=${pages}`);
    console.log(`  cache(skip without force)=${cached.skip}`);
    console.log(`  cache(skip with force)=${forced.skip}`);
    console.log(`  output=${data ? "yes" : "missing"}  hasContent=${hasContent}`);

    if (forced.skip) {
      console.error("  FAIL  force=true must not skip LCA study cache");
      failures++;
    }

    if (ref.id === "etex-natura-ea" && pages !== "5-7") {
      console.error(`  FAIL  ETEX LCA pages should be 5-7, got ${pages}`);
      failures++;
    }
    if (ref.id === "rockwool-rockfit-mono" && pages !== "9-10") {
      console.error(`  FAIL  Rockwool LCA pages should be 9-10, got ${pages}`);
      failures++;
    }

    if (!hasContent) {
      console.warn(
        `  WARN  no LCA study content yet — run: npm run phase3-lca-study -- "${pdfPath}" --force`
      );
    }
  }

  console.log("\n--- API contract (static) ---");
  console.log("  POST /api/extract/[...stem]  { full: true, force: true } on Re-extract");
  console.log("  POST /api/extract/[...stem]  { full: true, pendingOnly: true } on missing steps");

  if (failures) fail(`${failures} reference check(s) failed`);
  console.log("\nOK  extract pipeline smoke passed");
}

main();
