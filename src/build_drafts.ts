/**
 * Build formatted digital drafts from phase outputs + templates.
 *
 * Usage:
 *   npx tsx src/build_drafts.ts
 *   npx tsx src/build_drafts.ts EPD-S-P-12345-EN
 */

import "dotenv/config";
import { listEpdStems, loadPhase1, loadPhase2 } from "../lib/data";
import { writeDraftOutputs } from "../lib/templates";

function buildOne(stem: string): void {
  const data = { phase1: loadPhase1(stem), phase2: loadPhase2(stem) };
  if (!data.phase1 && !data.phase2) {
    console.warn(`skip ${stem}: no phase outputs`);
    return;
  }

  const draft = writeDraftOutputs(stem, data);
  const fieldCount = draft.sections.reduce((n, s) => n + s.fields.length, 0);
  console.log(`-> ${stem}  (${fieldCount} fields, ${draft.templateId} v${draft.templateVersion})`);
}

function main(): void {
  const args = process.argv.slice(2);
  const stems = args.length > 0 ? args : listEpdStems();

  if (stems.length === 0) {
    console.error("No phase outputs found. Run npm run demo or extract phases first.");
    process.exit(1);
  }

  for (const stem of stems) {
    buildOne(stem);
  }
}

main();
