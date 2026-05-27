/**
 * Build JSON-LD knowledge graph from phase outputs.
 *
 * Usage:
 *   npx tsx src/build_graph.ts
 *   npx tsx src/build_graph.ts EPD-S-P-12345-EN
 */

import "dotenv/config";
import { listEpdStems } from "../lib/data";
import { writeGraphForStem, rebuildCorpus } from "../lib/graph/write";

function buildOne(stem: string): void {
  const nodeCount = writeGraphForStem(stem);
  if (nodeCount === 0) {
    console.warn(`skip ${stem}: no phase outputs`);
    return;
  }
  console.log(`-> ${stem}  (${nodeCount} nodes)  -> data/graph/${stem}.jsonld`);
}

function main(): void {
  const args = process.argv.slice(2);
  const stems = args.length > 0 ? args : listEpdStems();

  if (stems.length === 0) {
    console.error("No phase outputs found. Run npm run demo or extract phases first.");
    process.exit(1);
  }

  for (const stem of stems) buildOne(stem);
  rebuildCorpus();
  console.log(`corpus  -> data/graph/corpus.jsonld`);
}

main();
