import * as fs from "node:fs";
import * as path from "node:path";
import { ROOT } from "./paths";

export interface ReferenceEpd {
  id: string;
  role: string;
  label: string;
  pdfFile: string;
  stem: string;
  epdNumber: string;
  program: string;
  producer: string;
  product: string;
  language: string;
  comparePath: string;
}

interface ReferenceIndex {
  version: string;
  pdfFolder: string;
  referenceEpds: ReferenceEpd[];
}

const INDEX_PATH = path.join(ROOT, "data", "reference", "index.json");

export function loadReferenceIndex(): ReferenceIndex {
  return JSON.parse(fs.readFileSync(INDEX_PATH, "utf-8")) as ReferenceIndex;
}

export function listReferenceEpds(): ReferenceEpd[] {
  return loadReferenceIndex().referenceEpds;
}

export function getReferenceByStem(stem: string): ReferenceEpd | null {
  return listReferenceEpds().find((r) => r.stem === stem) ?? null;
}

export function getCanonicalReference(): ReferenceEpd {
  const refs = listReferenceEpds();
  return refs.find((r) => r.role === "canonical") ?? refs[0]!;
}

export function referenceCompareDir(id: string): string {
  return path.join(ROOT, "data", "reference", id);
}
