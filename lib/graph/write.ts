import * as fs from "node:fs";
import * as path from "node:path";
import { listEpdStems } from "../data";
import { buildEpdGraph, toCorpusDocument, toJsonLdDocument } from "../jsonld/build";
import { GRAPH_DIR } from "../paths";
import { buildGraphDocumentForStem } from "./document";
import { graphInputHasData, loadEpdGraphInput } from "./input";

export function writeGraphForStem(stem: string): number {
  const doc = buildGraphDocumentForStem(stem);
  if (!doc) return 0;

  fs.mkdirSync(GRAPH_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(GRAPH_DIR, `${stem}.jsonld`),
    JSON.stringify(doc, null, 2)
  );
  return doc["@graph"].length;
}

export function rebuildCorpus(): void {
  const stems = listEpdStems();
  const allGraphs = stems
    .map((stem) => {
      const input = loadEpdGraphInput(stem);
      return graphInputHasData(input) ? buildEpdGraph(input) : [];
    })
    .filter((g) => g.length > 0);

  fs.mkdirSync(GRAPH_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(GRAPH_DIR, "corpus.jsonld"),
    JSON.stringify(toCorpusDocument(allGraphs), null, 2)
  );
}
