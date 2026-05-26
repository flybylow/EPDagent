import * as fs from "node:fs";
import * as path from "node:path";
import { DRAFTS_DIR, OUT_DIR, REFERENCE_DIR } from "../paths";
import { getReferenceByStem, referenceCompareDir } from "../reference";
import { loadTableManifest, tableRegistryForStem } from "../tables/manifest";
import type { TableExportManifest } from "../tables/types";
import type { PhaseDocmapResult } from "../extract/docmap";
import type { DraftDocument } from "../templates/types";
import type { Phase1Data, Phase2Data, Phase3CompositionData, Phase3ProductData } from "../types";

function readJson<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
}

function loadPhase1(stem: string): Phase1Data | null {
  return readJson<Phase1Data>(path.join(OUT_DIR, "phase1_filename", `${stem}.json`));
}

function loadPhase2(stem: string): Phase2Data | null {
  return readJson<Phase2Data>(path.join(OUT_DIR, "phase2_header", `${stem}.json`));
}

function loadDraft(stem: string): DraftDocument | null {
  return readJson<DraftDocument>(path.join(DRAFTS_DIR, stem, "draft.json"));
}

function loadPhase3(stem: string): Phase3ProductData | null {
  return readJson<Phase3ProductData>(path.join(OUT_DIR, "phase3_product", `${stem}.json`));
}

function loadPhase3Composition(stem: string): Phase3CompositionData | null {
  return readJson<Phase3CompositionData>(path.join(OUT_DIR, "phase3_composition", `${stem}.json`));
}

function loadDocmap(stem: string): PhaseDocmapResult | null {
  return readJson<PhaseDocmapResult>(path.join(OUT_DIR, "phase_docmap", `${stem}.json`));
}

export type PhaseStatus = "ready" | "visual_only" | "pending" | "empty";

export interface RegistryPhaseDef {
  id: string;
  order: number;
  name: string;
  description: string;
  outputDir?: string;
  apiPath?: string;
  apiQuery?: string;
  hasDraft?: boolean;
  tablePhase?: string;
}

export interface ResolvedPhase {
  id: string;
  order: number;
  name: string;
  description: string;
  status: PhaseStatus;
  apiUrl: string | null;
  entryCount: number | null;
  tables: TableExportManifest["tables"];
}

export interface EpdPhaseRegistry {
  stem: string;
  phases: ResolvedPhase[];
  docmap: PhaseDocmapResult | null;
  draft: DraftDocument | null;
  phase1: Phase1Data | null;
  phase2: Phase2Data | null;
  phase3: Phase3ProductData | null;
  phase3Composition: Phase3CompositionData | null;
}

interface PhasesRegistryFile {
  version: string;
  phases: RegistryPhaseDef[];
}

const REGISTRY_PATH = path.join(REFERENCE_DIR, "phases.registry.json");

export function loadPhaseRegistryDefs(): RegistryPhaseDef[] {
  const data = JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf-8")) as PhasesRegistryFile;
  return [...data.phases].sort((a, b) => a.order - b.order);
}

function loadDocmapSeed(stem: string): PhaseDocmapResult | null {
  const ref = getReferenceByStem(stem);
  if (!ref) return null;
  const seedPath = path.join(referenceCompareDir(ref.id), "docmap.seed.json");
  if (!fs.existsSync(seedPath)) return null;
  return JSON.parse(fs.readFileSync(seedPath, "utf-8")) as PhaseDocmapResult;
}

export function loadDocmapForStem(stem: string): PhaseDocmapResult | null {
  const extracted = loadDocmap(stem);
  if (extracted?.flat_entries.length) return extracted;
  const seed = loadDocmapSeed(stem);
  if (seed?.flat_entries.length) {
    return {
      ...seed,
      _source: {
        ...seed._source,
        page_spec_source: seed._source.page_spec_source ?? "reference_seed",
      },
    } as PhaseDocmapResult;
  }
  return extracted ?? seed;
}

function phaseOutputExists(outputDir: string | undefined, stem: string): boolean {
  if (!outputDir) return false;
  const dir = path.join(process.cwd(), "out", outputDir);
  return fs.existsSync(path.join(dir, `${stem}.json`));
}

function resolvePhaseStatus(
  def: RegistryPhaseDef,
  stem: string,
  docmap: PhaseDocmapResult | null,
  draft: DraftDocument | null,
  tableManifest: TableExportManifest | null
): { status: PhaseStatus; entryCount: number | null; tables: TableExportManifest["tables"] } {
  if (def.id === "docmap") {
    const count = docmap?.flat_entries.length ?? 0;
    return {
      status: count > 0 ? "ready" : "empty",
      entryCount: count,
      tables: [],
    };
  }

  if (def.id === "phase1") {
    return {
      status: loadPhase1(stem) ? "ready" : "pending",
      entryCount: null,
      tables: [],
    };
  }

  if (def.id === "phase2") {
    const hasPhase2 = !!loadPhase2(stem);
    const hasDraft = !!draft;
    return {
      status: hasDraft ? "ready" : hasPhase2 ? "visual_only" : "pending",
      entryCount: null,
      tables: [],
    };
  }

  if (def.tablePhase) {
    const registryTables = tableRegistryForStem(stem).filter((t) => t.phase === def.tablePhase);
    const exported =
      tableManifest?.tables.filter((t) => t.phase === def.tablePhase) ?? [];
    const hasJson = phaseOutputExists(def.outputDir, stem);

    if (hasJson) {
      return {
        status: "ready",
        entryCount: exported.length || null,
        tables: exported,
      };
    }
    if (exported.length > 0) {
      return { status: "visual_only", entryCount: exported.length, tables: exported };
    }
    if (registryTables.length > 0) {
      return { status: "pending", entryCount: registryTables.length, tables: [] };
    }
    return { status: "pending", entryCount: null, tables: [] };
  }

  if (phaseOutputExists(def.outputDir, stem)) {
    return { status: "ready", entryCount: null, tables: [] };
  }

  return { status: "pending", entryCount: null, tables: [] };
}

function apiUrlForPhase(def: RegistryPhaseDef, stem: string): string | null {
  if (!def.apiPath) return null;
  const encoded = encodeURIComponent(stem);
  if (def.apiQuery) {
    return `/api/${def.apiPath}/${encoded}?${def.apiQuery}`;
  }
  return `/api/${def.apiPath}/${encoded}`;
}

export function resolveEpdPhases(stem: string): EpdPhaseRegistry {
  const defs = loadPhaseRegistryDefs();
  const docmap = loadDocmapForStem(stem);
  const draft = loadDraft(stem);
  const phase1 = loadPhase1(stem);
  const phase2 = loadPhase2(stem);
  const phase3 = loadPhase3(stem);
  const phase3Composition = loadPhase3Composition(stem);
  const tableManifest = loadTableManifest(stem);

  const phases: ResolvedPhase[] = defs.map((def) => {
    const { status, entryCount, tables } = resolvePhaseStatus(
      def,
      stem,
      docmap,
      draft,
      tableManifest
    );
    return {
      id: def.id,
      order: def.order,
      name: def.name,
      description: def.description,
      status,
      apiUrl: apiUrlForPhase(def, stem),
      entryCount,
      tables,
    };
  });

  return { stem, phases, docmap, draft, phase1, phase2, phase3, phase3Composition };
}
