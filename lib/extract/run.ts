import { phase2CacheStatus } from "../anthropic/guard";
import { loadPhase1, loadPhase2, pdfPathForStem } from "../data";
import { docmapIsCached } from "./docmap-cache";
import { writeDocmap } from "./docmap";
import { runPhase1 } from "./phase1";
import { runPhase2 } from "./phase2";
import { rebuildCorpus, writeGraphForStem } from "../graph/write";
import { writeDraftOutputs } from "../templates";

export interface ExtractOptions {
  phase2?: boolean;
  force?: boolean;
}

export interface ExtractResult {
  stem: string;
  pdfPath: string;
  phase1: boolean;
  phase2: boolean;
  graphNodes: number;
  draft: boolean;
}

export async function extractPdf(stem: string, options: ExtractOptions = {}): Promise<ExtractResult> {
  const pdfPath = pdfPathForStem(stem);
  if (!pdfPath) {
    throw new Error(`PDF not found for ${stem}. Add ${stem}.pdf to the EPD folder (pdfs/ or EPDAGENT_PDF_DIR).`);
  }

  const runPhase2Step = options.phase2 !== false;
  const force = options.force ?? false;
  runPhase1(pdfPath);

  if (!docmapIsCached(stem)) {
    await writeDocmap(pdfPath);
  }

  if (runPhase2Step) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is required for phase 2 header extraction.");
    }
    const cache = phase2CacheStatus(stem, pdfPath, force);
    if (force || !cache.skip) {
      await runPhase2(pdfPath, apiKey, { force });
    }
  }

  const graphNodes = writeGraphForStem(stem);
  rebuildCorpus();
  writeDraftOutputs(stem, { phase1: loadPhase1(stem), phase2: loadPhase2(stem) });

  return {
    stem,
    pdfPath,
    phase1: true,
    phase2: runPhase2Step && !!loadPhase2(stem),
    graphNodes,
    draft: true,
  };
}
