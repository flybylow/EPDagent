import * as fs from "node:fs";
import * as path from "node:path";
import { listEpdStems, loadPhase1, loadPhase2 } from "../data";
import { buildEpdGraph, toCorpusDocument, toJsonLdDocument } from "../jsonld/build";
import { GRAPH_DIR } from "../paths";

export function writeGraphForStem(stem: string): number {
  const phase1 = loadPhase1(stem);
  const phase2 = loadPhase2(stem);
  if (!phase1 && !phase2) return 0;

  const graph = buildEpdGraph(stem, phase1, phase2);
  fs.mkdirSync(GRAPH_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(GRAPH_DIR, `${stem}.jsonld`),
    JSON.stringify(toJsonLdDocument(graph), null, 2)
  );
  return graph.length;
}

export function rebuildCorpus(): void {
  const stems = listEpdStems();
  const allGraphs = stems.map((stem) => {
    const phase1 = loadPhase1(stem);
    const phase2 = loadPhase2(stem);
    return buildEpdGraph(stem, phase1, phase2);
  });

  fs.mkdirSync(GRAPH_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(GRAPH_DIR, "corpus.jsonld"),
    JSON.stringify(toCorpusDocument(allGraphs), null, 2)
  );
}
