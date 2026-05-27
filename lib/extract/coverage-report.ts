import * as fs from "node:fs";
import * as path from "node:path";
import { loadDocmapForStem, resolveEpdPhases } from "../phases/registry";
import {
  resolveSectionAvailability,
  sectionStatusFromAvailability,
} from "../templates/section-view-resolve";
import { loadTableManifest, tableRegistryForStem } from "../tables/manifest";
import type { SectionNavItem } from "../navigation/sections";

export interface SectionCoverageRow {
  id: string;
  number: string;
  title: string;
  page: number | null;
  status: "ready" | "visual_only" | "pending";
  hasExtractedContent: boolean;
  hasVisualExport: boolean;
  hasPdfLink: boolean;
  pendingMessage: string | null;
}

export interface ReferenceCoverageReport {
  stem: string;
  referenceId: string | null;
  generatedAt: string;
  totalPages: number | null;
  docmapEntries: number;
  sections: SectionCoverageRow[];
  summary: {
    ready: number;
    visual_only: number;
    pending: number;
    withPdf: number;
  };
}

function flattenNav(items: SectionNavItem[]): SectionNavItem[] {
  const out: SectionNavItem[] = [];
  for (const item of items) {
    out.push(item);
    if (item.children?.length) out.push(...flattenNav(item.children));
  }
  return out;
}

export function buildReferenceCoverageReport(
  stem: string,
  options: { referenceId?: string | null; pdfAvailable?: boolean } = {}
): ReferenceCoverageReport {
  const registry = resolveEpdPhases(stem, { pdfAvailable: options.pdfAvailable ?? true });
  const docmap = loadDocmapForStem(stem);
  const flat = flattenNav(registry.sectionNav.items);

  const sections: SectionCoverageRow[] = flat.map((section) => {
    const availability = resolveSectionAvailability(
      section,
      {
        stem: registry.stem,
        draft: registry.draft,
        phase1: registry.phase1,
        phase2: registry.phase2,
        phase3: registry.phase3,
        phase3Composition: registry.phase3Composition,
        phase3LcaStudy: registry.phase3LcaStudy,
        phase4Probe: registry.phase4Probe,
        phase4Probes: registry.phase4Probes,
        phase5: registry.phase5,
        phase6: registry.phase6,
        phase7: registry.phase7,
        phases: registry.phases,
        exportedTableIds:
          loadTableManifest(stem)?.tables.map((t) => t.id) ??
          tableRegistryForStem(stem).map((t) => t.id),
      },
      options.pdfAvailable ?? true,
      registry.sectionViewTemplate
    );
    const status = sectionStatusFromAvailability(availability);
    return {
      id: section.id,
      number: section.number,
      title: section.title,
      page: section.page,
      status,
      hasExtractedContent: availability.hasExtractedContent,
      hasVisualExport: availability.hasVisualExport,
      hasPdfLink: availability.hasPdfLink,
      pendingMessage: availability.pendingMessage,
    };
  });

  const pages = docmap?.flat_entries.map((e) => e.page).filter((p): p is number => p != null) ?? [];
  const summary = {
    ready: sections.filter((s) => s.status === "ready").length,
    visual_only: sections.filter((s) => s.status === "visual_only").length,
    pending: sections.filter((s) => s.status === "pending").length,
    withPdf: sections.filter((s) => s.hasPdfLink).length,
  };

  return {
    stem,
    referenceId: options.referenceId ?? null,
    generatedAt: new Date().toISOString(),
    totalPages: pages.length ? Math.max(...pages) : null,
    docmapEntries: docmap?.flat_entries.length ?? 0,
    sections,
    summary,
  };
}

export function writeReferenceCoverageReport(
  report: ReferenceCoverageReport,
  outDir = path.join(process.cwd(), "out", "reference_extract")
): string {
  fs.mkdirSync(outDir, { recursive: true });
  const safeStem = report.stem.replace(/[^\w.-]+/g, "_").slice(0, 80);
  const file = path.join(outDir, `${safeStem}.coverage.json`);
  fs.writeFileSync(file, JSON.stringify(report, null, 2));
  return file;
}
