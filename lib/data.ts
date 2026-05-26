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
import type { EpdRecord, Phase1Data, Phase2Data } from "./types";
import type { DraftDocument, DraftManifest, VerificationResult } from "./templates/types";
import { getReferenceByStem } from "./reference";

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

function listStems(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json") && !f.endsWith(".error.json"))
    .map((f) => path.basename(f, ".json"));
}

export function listEpdStems(): string[] {
  const stems = new Set<string>([
    ...listPdfFiles().map((f) => pdfStem(f)),
    ...listStems(PHASE_DIRS.phase1),
    ...listStems(PHASE_DIRS.phase2),
  ]);
  return [...stems].sort();
}

export function loadPhase1(stem: string): Phase1Data | null {
  return readJson<Phase1Data>(path.join(PHASE_DIRS.phase1, `${stem}.json`));
}

export function loadPhase2(stem: string): Phase2Data | null {
  return readJson<Phase2Data>(path.join(PHASE_DIRS.phase2, `${stem}.json`));
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

export function pdfPathForStem(stem: string): string | null {
  const candidate = path.join(pdfDir(), `${stem}.pdf`);
  return fs.existsSync(candidate) ? candidate : null;
}

export function loadEpdRecord(stem: string): EpdRecord {
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
  const phase1 = loadPhase1(stem);
  const phase2 = loadPhase2(stem);
  const reference = getReferenceByStem(stem);

  return {
    stem,
    pdfFilename: pdfPath ? `${stem}.pdf` : phase1?.pdf_filename ?? null,
    hasPdf: !!pdfPath,
    isDemoFixture: isDemoFixture(phase1, phase2),
    needsExtraction: !!pdfPath && (!phase1 || !phase2),
    referenceId: reference?.id ?? null,
    referenceLabel: reference?.label ?? null,
    phase1,
    phase2,
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
