import * as fs from "node:fs";
import * as path from "node:path";
import { createHash } from "node:crypto";
import { PHASE_DIRS, pdfStem } from "../paths";
import { extractPageLines } from "../pdf/text-lines";
import {
  buildTocTree,
  countTreeNodes,
  parseTocFromLines,
  type FlatTocEntry,
  type TocNode,
} from "./docmap-parse";
import { resolveDocmapPageSpec } from "./docmap-pages";

export interface PhaseDocmapResult {
  toc_title: string | null;
  source_pages: number[];
  entries: TocNode[];
  flat_entries: FlatTocEntry[];
  _source: {
    pdf_path: string;
    pdf_sha256: string;
    page_spec_source: "manifest" | "scan" | "default";
    extracted_by: "pdf-text-toc-parser";
    extracted_at: string;
    entry_count: number;
    tree_node_count: number;
  };
}

function sha256File(filePath: string): string {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

export async function extractDocmap(pdfPath: string): Promise<PhaseDocmapResult> {
  const stem = pdfStem(pdfPath);
  const { pages, source } = await resolveDocmapPageSpec(pdfPath, stem);

  const allLines = [];
  for (const pageNum of pages) {
    const lines = await extractPageLines(pdfPath, pageNum);
    allLines.push(...lines);
  }

  const { tocTitle, entries: flat } = parseTocFromLines(allLines);
  const tree = buildTocTree(flat);

  return {
    toc_title: tocTitle,
    source_pages: pages,
    entries: tree,
    flat_entries: flat,
    _source: {
      pdf_path: pdfPath,
      pdf_sha256: sha256File(pdfPath),
      page_spec_source: source,
      extracted_by: "pdf-text-toc-parser",
      extracted_at: new Date().toISOString(),
      entry_count: flat.length,
      tree_node_count: countTreeNodes(tree),
    },
  };
}

export async function writeDocmap(pdfPath: string): Promise<string> {
  const stem = pdfStem(pdfPath);
  const result = await extractDocmap(pdfPath);
  fs.mkdirSync(PHASE_DIRS.phase_docmap, { recursive: true });
  const outPath = path.join(PHASE_DIRS.phase_docmap, `${stem}.json`);
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  return outPath;
}
