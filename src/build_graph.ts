/**
 * Build JSON-LD knowledge graph from phase outputs.
 *
 * Usage:
 *   npx tsx src/build_graph.ts
 *   npx tsx src/build_graph.ts EPD-S-P-12345-EN
 */

import * as fs from "node:fs";
import * as path from "node:path";
import "dotenv/config";
import { listEpdStems, loadPhase1, loadPhase2 } from "../lib/data";
import { GRAPH_DIR } from "../lib/paths";
import { buildEpdGraph, toCorpusDocument, toJsonLdDocument } from "../lib/jsonld/build";

function buildOne(stem: string): void {
  const phase1 = loadPhase1(stem);
  const phase2 = loadPhase2(stem);

  if (!phase1 && !phase2) {
    console.warn(`skip ${stem}: no phase outputs`);
    return;
  }

  const graph = buildEpdGraph(stem, phase1, phase2);
  const doc = toJsonLdDocument(graph);
  const outPath = path.join(GRAPH_DIR, `${stem}.jsonld`);

  fs.mkdirSync(GRAPH_DIR, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(doc, null, 2));
  console.log(`-> ${stem}  (${graph.length} nodes)  -> ${path.relative(process.cwd(), outPath)}`);
}

function main(): void {
  const args = process.argv.slice(2);
  const stems = args.length > 0 ? args : listEpdStems();

  if (stems.length === 0) {
    console.error("No phase outputs found. Run npm run demo or extract phases first.");
    process.exit(1);
  }

  const allGraphs = stems.map((stem) => {
    buildOne(stem);
    const phase1 = loadPhase1(stem);
    const phase2 = loadPhase2(stem);
    return buildEpdGraph(stem, phase1, phase2);
  });

  const corpusPath = path.join(GRAPH_DIR, "corpus.jsonld");
  fs.writeFileSync(corpusPath, JSON.stringify(toCorpusDocument(allGraphs), null, 2));
  console.log(`corpus  ${allGraphs.flat().length} nodes  -> ${path.relative(process.cwd(), corpusPath)}`);
}

main();
