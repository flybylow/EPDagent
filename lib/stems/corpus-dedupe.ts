import * as fs from "node:fs";
import * as path from "node:path";
import { docmapIsCached } from "../extract/docmap-cache";
import { OUT_DIR, pdfDir, pdfStem } from "../paths";
import { listPdfFiles } from "../paths";

const PHASE1_DIR = path.join(OUT_DIR, "phase1_filename");
const PHASE2_DIR = path.join(OUT_DIR, "phase2_header");

/** Normalized identity for one EPD (PDF + phase outputs). */
export function corpusStemKey(stem: string): string {
  return foldStem(stem);
}

function foldStem(s: string): string {
  return s
    .normalize("NFC")
    .replace(/[\u201C\u201D\u2018\u2019""]/g, '"')
    .replace(/(\d),(\d)/g, "$1.$2")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function listStemsFromDir(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json") && !f.endsWith(".error.json"))
    .map((f) => path.basename(f, ".json"));
}

export function collectCandidateStems(): string[] {
  const stems = new Set<string>([
    ...listPdfFiles().map((f) => pdfStem(f)),
    ...listStemsFromDir(PHASE1_DIR),
    ...listStemsFromDir(PHASE2_DIR),
  ]);
  return [...stems];
}

function stemArtifactScore(stem: string): number {
  let score = 0;
  if (fs.existsSync(path.join(pdfDir(), `${stem}.pdf`))) score += 16;
  if (fs.existsSync(path.join(PHASE1_DIR, `${stem}.json`))) score += 4;
  if (fs.existsSync(path.join(PHASE2_DIR, `${stem}.json`))) score += 2;
  if (docmapIsCached(stem)) score += 1;
  return score;
}

/** Prefer on-disk PDF basename, then richest phase outputs. */
export function pickCanonicalStem(candidates: string[]): string {
  const unique = [...new Set(candidates)];
  if (unique.length === 1) return unique[0]!;

  const dir = pdfDir();
  if (fs.existsSync(dir)) {
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith(".pdf")) continue;
      const base = path.basename(file, ".pdf");
      const match = unique.find((s) => foldStem(s) === foldStem(base));
      if (match) return base;
    }
  }

  return unique.reduce((best, stem) =>
    stemArtifactScore(stem) > stemArtifactScore(best) ? stem : best
  );
}

export function groupCorpusStemsByIdentity(stems: string[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  for (const stem of stems) {
    const key = corpusStemKey(stem);
    const list = groups.get(key) ?? [];
    list.push(stem);
    groups.set(key, list);
  }
  return groups;
}

export function dedupeCorpusStems(stems: string[]): string[] {
  const canonical: string[] = [];
  for (const group of groupCorpusStemsByIdentity(stems).values()) {
    canonical.push(pickCanonicalStem(group));
  }
  return canonical.sort();
}

let aliasToCanonical: Map<string, string> | null = null;

function rebuildAliasMap(): Map<string, string> {
  const map = new Map<string, string>();
  const candidates = collectCandidateStems();
  for (const group of groupCorpusStemsByIdentity(candidates).values()) {
    const canonical = pickCanonicalStem(group);
    for (const alias of group) {
      map.set(alias, canonical);
      map.set(alias.normalize("NFC"), canonical);
      map.set(alias.normalize("NFD"), canonical);
    }
    map.set(canonical, canonical);
  }
  return map;
}

export function corpusStemAliasMap(): Map<string, string> {
  if (!aliasToCanonical) {
    aliasToCanonical = rebuildAliasMap();
  }
  return aliasToCanonical;
}

/** Clear cached alias map after extract/docmap writes (optional). */
export function invalidateCorpusStemCache(): void {
  aliasToCanonical = null;
}

/** All stem strings that refer to the same EPD as the canonical stem. */
export function aliasStemsForCanonical(stem: string): string[] {
  const canonical = resolveCanonicalCorpusStem(stem);
  const aliases = new Set<string>([canonical]);
  for (const [alias, canon] of corpusStemAliasMap()) {
    if (canon === canonical) aliases.add(alias);
  }
  return [...aliases];
}

export function resolveCanonicalCorpusStem(raw: string): string {
  const trimmed = raw.trim();
  const map = corpusStemAliasMap();
  if (map.has(trimmed)) return map.get(trimmed)!;
  const nfc = trimmed.normalize("NFC");
  if (map.has(nfc)) return map.get(nfc)!;
  const nfd = trimmed.normalize("NFD");
  if (map.has(nfd)) return map.get(nfd)!;

  const key = corpusStemKey(trimmed);
  for (const [alias, canonical] of map) {
    if (corpusStemKey(alias) === key) return canonical;
  }

  return trimmed.normalize("NFC");
}
