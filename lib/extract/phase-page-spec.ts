import * as fs from "node:fs";
import * as path from "node:path";
import { getReferenceByStem, referenceCompareDir } from "../reference";
import { loadDocmapForStem } from "../phases/registry";
import { repairFlatTocEntries } from "./docmap-parse";
import { parsePageSpecs } from "../pdf/pages";

function readManifestPages(stem: string, key: string): string | null {
  const ref = getReferenceByStem(stem);
  if (!ref) return null;
  const manifestPath = path.join(referenceCompareDir(ref.id), "manifest.json");
  if (!fs.existsSync(manifestPath)) return null;
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as Record<string, string>;
  return manifest[key]?.trim() || null;
}

/** Comma-separated ranges; avoids filling gaps (e.g. 1-8 + 27 → `1-8,27` not `1-27`). */
export function pageSpecFromNumbers(pages: number[]): string | null {
  if (pages.length === 0) return null;
  const sorted = [...new Set(pages)].sort((a, b) => a - b);
  const parts: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];

  for (let i = 1; i < sorted.length; i += 1) {
    const page = sorted[i];
    if (page === prev + 1) {
      prev = page;
      continue;
    }
    parts.push(start === prev ? String(start) : `${start}-${prev}`);
    start = prev = page;
  }
  parts.push(start === prev ? String(start) : `${start}-${prev}`);
  return parts.join(",");
}

/** Page range from docmap entries whose title matches (e.g. application unit). */
export function pagesFromDocmapTitle(
  stem: string,
  titlePattern: RegExp
): string | null {
  const docmap = loadDocmapForStem(stem);
  if (!docmap?.flat_entries.length) return null;

  const pages = docmap.flat_entries
    .filter((e) => titlePattern.test(e.title))
    .map((e) => e.page)
    .filter((p): p is number => p != null);

  return pageSpecFromNumbers(pages);
}

/** Page range from docmap flat entries matching section prefix (e.g. "10"). */
export function pagesFromDocmapSection(stem: string, sectionPrefix: string): string | null {
  const docmap = loadDocmapForStem(stem);
  if (!docmap?.flat_entries.length) return null;

  const pages = docmap.flat_entries
    .filter((e) => e.number === sectionPrefix || e.number.startsWith(`${sectionPrefix}.`))
    .map((e) => e.page)
    .filter((p): p is number => p != null);

  return pageSpecFromNumbers(pages);
}

/** Union page specs (e.g. span + point pages from docmap). */
export function mergePageSpecs(...specs: (string | null | undefined)[]): string {
  const pages: number[] = [];
  for (const spec of specs) {
    if (!spec?.trim()) continue;
    pages.push(...parsePageSpecs(spec));
  }
  return pageSpecFromNumbers(pages) ?? "";
}

/**
 * Page range per target section: from its TOC page through the page before the next
 * docmap entry with a higher page (narrative often continues past the TOC line).
 */
export function pagesFromDocmapTargetSpans(
  stem: string,
  isTarget: (sectionNumber: string, title: string) => boolean
): string | null {
  const docmap = loadDocmapForStem(stem);
  if (!docmap?.flat_entries.length) return null;

  const flat = repairFlatTocEntries(docmap.flat_entries);
  const pages = new Set<number>();

  for (let i = 0; i < flat.length; i++) {
    const entry = flat[i];
    if (entry.page == null || !isTarget(entry.number, entry.title)) continue;

    const start = entry.page;
    let end = start;

    for (let j = i + 1; j < flat.length; j++) {
      const nextPage = flat[j].page;
      if (nextPage != null && nextPage > start) {
        end = nextPage - 1;
        break;
      }
    }

    if (end < start) end = start;
    if (end === start) {
      const later = flat.slice(i + 1).find((e) => e.page != null && e.page > start);
      end = later ? Math.max(start, later.page! - 1) : start + 1;
    }

    for (let p = start; p <= end; p++) pages.add(p);
  }

  const targetPages = flat
    .filter((e) => e.page != null && isTarget(e.number, e.title))
    .map((e) => e.page!);
  if (targetPages.length) {
    const maxT = Math.max(...targetPages);
    const after = flat.find((e) => e.page != null && e.page > maxT);
    if (after?.page != null && after.page <= maxT + 2) {
      for (let p = maxT; p < after.page; p++) pages.add(p);
    }
  }

  return pageSpecFromNumbers([...pages]);
}

/** Page range from docmap entries matching a section-number predicate. */
export function pagesFromDocmapSections(
  stem: string,
  matchSection: (sectionNumber: string) => boolean
): string | null {
  const docmap = loadDocmapForStem(stem);
  if (!docmap?.flat_entries.length) return null;

  const pages = docmap.flat_entries
    .filter((e) => matchSection(e.number))
    .map((e) => e.page)
    .filter((p): p is number => p != null);

  return pageSpecFromNumbers(pages);
}

export function resolveManifestOrDocmapPages(
  stem: string,
  manifestKey: string,
  docmapSection: string,
  envFallback: string
): string {
  return (
    readManifestPages(stem, manifestKey) ??
    pagesFromDocmapSection(stem, docmapSection) ??
    process.env[envFallback]?.trim() ??
    ""
  );
}
