import * as fs from "node:fs";
import * as path from "node:path";
import {
  DEFAULT_PDF_DIR,
  DRAFTS_DIR,
  GRAPH_DIR,
  OUT_DIR,
  PHASE_DIRS,
  VERIFICATION_DIR,
  listPdfFiles,
  pdfDir,
  pdfStem,
} from "./paths";
import { docmapIsCached } from "./extract/docmap-cache";
import { sectionNavCoverageStats } from "./navigation/coverage-stats";
import { summarizeExtractRun } from "./extract/extract-plan-status";
import { resolveEpdPhases } from "./phases/registry";
import { resolveCorpusPhases } from "./phases/registry";
import { phaseShortLabel } from "./phases/short-labels";
import type {
  EpdRecord,
  Phase1Data,
  Phase2Data,
  Phase3CompositionData,
  Phase3LcaStudyData,
  Phase3ProductData,
  Phase5ScenariosData,
  Phase6RefsData,
  Phase7EpdSectionsData,
} from "./types";
import type { DraftDocument, DraftManifest, VerificationResult } from "./templates/types";
import type { PhaseDocmapResult } from "./extract/docmap";
import { getReferenceByStem } from "./reference";
import {
  aliasStemsForCanonical,
  collectCandidateStems,
  dedupeCorpusStems,
  invalidateCorpusStemCache,
  resolveCanonicalCorpusStem,
} from "./stems/corpus-dedupe";

function isDemoFixture(phase1: Phase1Data | null, phase2: Phase2Data | null): boolean {
  const by =
    phase2?._source?.extracted_by ??
    phase1?._source?.extracted_by;
  return by === "demo-fixture";
}

function readJson<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
}

export function listEpdStems(): string[] {
  invalidateCorpusStemCache();
  return dedupeCorpusStems(collectCandidateStems());
}

function readPhaseJson<T>(phaseDir: string, stem: string): T | null {
  for (const alias of aliasStemsForCanonical(stem)) {
    const data = readJson<T>(path.join(phaseDir, `${alias}.json`));
    if (data) return data;
  }
  return null;
}

export function loadPhase1(stem: string): Phase1Data | null {
  return readPhaseJson<Phase1Data>(PHASE_DIRS.phase1, stem);
}

export function loadPhase2(stem: string): Phase2Data | null {
  return readPhaseJson<Phase2Data>(PHASE_DIRS.phase2, stem);
}

export function loadPhase3(stem: string): Phase3ProductData | null {
  return readJson<Phase3ProductData>(path.join(PHASE_DIRS.phase3, `${stem}.json`));
}

export function loadPhase3Composition(stem: string): Phase3CompositionData | null {
  return readJson<Phase3CompositionData>(path.join(PHASE_DIRS.phase3_composition, `${stem}.json`));
}

export function loadPhase3LcaStudy(stem: string): Phase3LcaStudyData | null {
  return readJson<Phase3LcaStudyData>(path.join(PHASE_DIRS.phase3_lca_study, `${stem}.json`));
}

export function loadPhase5(stem: string): Phase5ScenariosData | null {
  return readJson<Phase5ScenariosData>(path.join(PHASE_DIRS.phase5, `${stem}.json`));
}

export function loadPhase6(stem: string): Phase6RefsData | null {
  return readJson<Phase6RefsData>(path.join(PHASE_DIRS.phase6, `${stem}.json`));
}

export function loadPhase7(stem: string): Phase7EpdSectionsData | null {
  return readJson<Phase7EpdSectionsData>(path.join(PHASE_DIRS.phase7, `${stem}.json`));
}

export function loadGraphDocument(stem: string): Record<string, unknown> | null {
  const jsonld = path.join(GRAPH_DIR, `${stem}.jsonld`);
  return readJson<Record<string, unknown>>(jsonld);
}

export function loadCorpus(): Record<string, unknown> | null {
  return readJson<Record<string, unknown>>(path.join(GRAPH_DIR, "corpus.jsonld"));
}

export function loadDraft(stem: string): DraftDocument | null {
  return readJson<DraftDocument>(path.join(DRAFTS_DIR, stem, "draft.json"));
}

export function loadDraftManifest(stem: string): DraftManifest | null {
  return readJson<DraftManifest>(path.join(DRAFTS_DIR, stem, "manifest.json"));
}

export function loadVerification(stem: string): VerificationResult | null {
  return readJson<VerificationResult>(path.join(VERIFICATION_DIR, `${stem}.json`));
}

export function loadDocmap(stem: string): PhaseDocmapResult | null {
  const canonical = canonicalExtractStem(stem);
  return readJson<PhaseDocmapResult>(
    path.join(PHASE_DIRS.phase_docmap, `${canonical}.json`)
  );
}

/** Resolve on-disk PDF for a corpus stem, phase1 metadata, or reference id/stem. */
export function resolvePdfPathForStem(stem: string): string | null {
  const dir = pdfDir();
  const direct = path.join(dir, `${stem}.pdf`);
  if (fs.existsSync(direct)) return direct;

  const phase1 = loadPhase1(stem);
  if (phase1?.pdf_filename) {
    const byFilename = path.join(dir, phase1.pdf_filename);
    if (fs.existsSync(byFilename)) return byFilename;
  }
  if (phase1?.pdf_stem && phase1.pdf_stem !== stem) {
    const byStem = path.join(dir, `${phase1.pdf_stem}.pdf`);
    if (fs.existsSync(byStem)) return byStem;
  }

  const reference = getReferenceByStem(stem);
  if (reference) {
    const byRef = path.join(dir, reference.pdfFile);
    if (fs.existsSync(byRef)) return byRef;
  }

  if (!fs.existsSync(dir)) return null;

  const folded = foldPdfStem(stem);
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".pdf")) continue;
    const base = path.basename(file, ".pdf");
    if (foldPdfStem(base) === folded) return path.join(dir, file);
  }

  return null;
}

function foldPdfStem(s: string): string {
  return s
    .normalize("NFC")
    .replace(/[\u201C\u201D\u2018\u2019""]/g, '"')
    .replace(/(\d),(\d)/g, "$1.$2")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Resolve URL/corpus stem to canonical on-disk identity (Unicode, comma/period, etc.). */
export function resolveCorpusStem(raw: string): string {
  const canonical = resolveCanonicalCorpusStem(raw);
  if (pdfPathForStem(canonical)) return canonicalExtractStem(canonical);
  return canonical;
}

export function pdfPathForStem(stem: string): string | null {
  return resolvePdfPathForStem(stem);
}

/** Stem that matches on-disk outputs (handles Unicode quotes in PDF filenames). */
export function canonicalExtractStem(stem: string): string {
  const pdfPath = resolvePdfPathForStem(stem);
  if (pdfPath) return path.basename(pdfPath, path.extname(pdfPath));
  return stem;
}

export function loadEpdRecord(rawStem: string): EpdRecord {
  const stem = resolveCorpusStem(rawStem);
  const graphPath = fs.existsSync(path.join(GRAPH_DIR, `${stem}.jsonld`))
    ? path.join(GRAPH_DIR, `${stem}.jsonld`)
    : null;
  const draftPath = fs.existsSync(path.join(DRAFTS_DIR, stem, "draft.json"))
    ? path.join(DRAFTS_DIR, stem, "draft.json")
    : null;
  const verificationPath = fs.existsSync(path.join(VERIFICATION_DIR, `${stem}.json`))
    ? path.join(VERIFICATION_DIR, `${stem}.json`)
    : null;

  const pdfPath = pdfPathForStem(stem);
  const pdfServeStem = pdfPath ? path.basename(pdfPath, path.extname(pdfPath)) : null;
  const phase1 = loadPhase1(stem);
  const phase2 = loadPhase2(stem);
  const reference = getReferenceByStem(stem);
  const pipelinePhases = resolveCorpusPhases(stem).map((phase) => ({
    id: phase.id,
    shortLabel: phaseShortLabel(phase.id),
    name: phase.name,
    status: phase.status,
  }));
  const extractRun = summarizeExtractRun(stem);
  const sectionCoverage = pdfPath
    ? sectionNavCoverageStats(
        resolveEpdPhases(stem, { pdfAvailable: true }).sectionNav.items
      )
    : null;

  return {
    stem,
    pdfFilename: pdfPath
      ? path.basename(pdfPath)
      : phase1?.pdf_filename ?? null,
    hasPdf: !!pdfPath,
    pdfServeStem,
    isDemoFixture: isDemoFixture(phase1, phase2),
    needsExtraction: !!pdfPath && (!phase1 || !phase2 || !docmapIsCached(stem)),
    referenceId: reference?.id ?? null,
    referenceLabel: reference?.label ?? null,
    phase1,
    phase2,
    pipelinePhases,
    hasDocmapIndex: docmapIsCached(stem),
    sectionCoverage,
    extractSummary: {
      apiRunnableCount: extractRun.apiRunnableCount,
      pendingCount: extractRun.pendingCount,
      upToDate: extractRun.upToDate,
      pendingStepLabels: extractRun.runnableSteps.map((s) => s.label),
    },
    graphPath,
    draftPath,
    verificationPath,
    pdfPath,
  };
}

export function listEpdRecords(): EpdRecord[] {
  return listEpdStems().map(loadEpdRecord);
}

export function listPdfFilenames(): string[] {
  return listPdfFiles();
}

export function getPdfFolderInfo() {
  const dir = pdfDir();
  const defaultDir = DEFAULT_PDF_DIR;
  const configured = process.env.EPDAGENT_PDF_DIR?.trim() ?? null;
  const files = listPdfFiles();
  return {
    path: dir,
    defaultPath: defaultDir,
    isDefault: !configured,
    configured,
    count: files.length,
    files,
  };
}

export { pdfStem, pdfDir, OUT_DIR, GRAPH_DIR, DRAFTS_DIR, VERIFICATION_DIR, PHASE_DIRS };
