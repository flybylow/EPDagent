import { buildEpdGraph, toJsonLdDocument } from "../jsonld/build";
import type { JsonLdDocument } from "../types";
import { graphInputHasData, loadEpdGraphInput } from "./input";

export function buildGraphDocumentForStem(stem: string): JsonLdDocument | null {
  const input = loadEpdGraphInput(stem);
  if (!graphInputHasData(input)) return null;
  return toJsonLdDocument(buildEpdGraph(input)) as JsonLdDocument;
}
