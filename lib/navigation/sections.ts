import { buildTocTree, type TocNode } from "../extract/docmap-parse";
import {
  collapseTitle,
  isBibliographySection,
  isPhase7NarrativeSection,
  navSectionTitle,
  titleMatches,
} from "./title-match";
import type { PhaseStatus, ResolvedPhase } from "../phases/registry";
import type { TableExportDef } from "../tables/types";
import {
  resolveSectionAvailability,
  sectionStatusFromAvailability,
  type EpdContentContext,
} from "../templates/section-view-resolve";
import type { SectionViewTemplate } from "../templates/section-view-types";
import { coverPdfPage } from "../extract/phase2-enrich";
import { isJunkDocmapEntry } from "./docmap-quality";
import { isValidSectionNumber } from "./section-numbers";

export type EpdViewMode = "compare" | "pdf" | "content";

export interface SectionNavAvailability {
  hasPdfLink: boolean;
  hasExtractedContent: boolean;
  hasVisualExport: boolean;
  pendingMessage: string | null;
}

export interface SectionNavItem {
  id: string;
  number: string;
  title: string;
  page: number | null;
  level: number;
  phaseId: string | null;
  tableId: string | null;
  status: PhaseStatus;
  availability: SectionNavAvailability;
  children?: SectionNavItem[];
}

export interface SectionNavTree {
  items: SectionNavItem[];
  defaultSectionId: string | null;
}

export function resolveSectionBinding(
  sectionNumber: string,
  title: string,
  tables: TableExportDef[]
): { phaseId: string | null; tableId: string | null } {
  const bySection = tables.find((t) => t.section === sectionNumber);
  if (bySection) {
    return { phaseId: bySection.phase, tableId: bySection.id };
  }

  if (sectionNumber === "1.5" || sectionNumber.startsWith("1.5.")) {
    const table = tables.find((t) => t.id === "composition");
    return { phaseId: "phase3_composition", tableId: table?.id ?? "composition" };
  }

  if (sectionNumber === "2") {
    const table = tables.find((t) => t.id === "technical_data");
    return { phaseId: "phase3_product", tableId: table?.id ?? "technical_data" };
  }

  if (sectionNumber === "10" || sectionNumber.startsWith("10.")) {
    return { phaseId: "phase5_scenarios", tableId: null };
  }

  if (isPhase7NarrativeSection(sectionNumber, title)) {
    return { phaseId: "phase7_epd_sections", tableId: null };
  }

  if (isBibliographySection(sectionNumber, title)) {
    return { phaseId: "phase6_refs", tableId: null };
  }

  if (sectionNumber === "1" || sectionNumber.startsWith("1.")) {
    return { phaseId: "phase3_product", tableId: null };
  }

  if (sectionNumber === "3" || sectionNumber.startsWith("3.")) {
    return { phaseId: "phase3_lca_study", tableId: null };
  }

  if (sectionNumber === "4" && titleMatches(title, /production\s*sites?/i)) {
    return { phaseId: "phase3_lca_study", tableId: null };
  }

  if (sectionNumber === "5" && titleMatches(title, /system\s*boundar/i)) {
    return { phaseId: "phase3_lca_study", tableId: null };
  }

  const lcaTable = tables.find((t) => t.phase === "phase4_lca");
  if (/^[6-9]\.\d+/.test(sectionNumber) && /explained|information|definitions/i.test(title)) {
    const parent = sectionNumber.split(".")[0];
    const match = tables.find((t) => t.phase === "phase4_lca" && t.section === parent);
    if (match) return { phaseId: "phase4_lca", tableId: match.id };
  }

  if (
    lcaTable &&
    (/^4$|^6$|^7$|^8$|^9$/.test(sectionNumber) ||
      /impact|resource|waste|output flow|lca table/i.test(title)) &&
    !/production site|system boundar/i.test(title)
  ) {
    const match = tables.find(
      (t) => t.phase === "phase4_lca" && (t.section === sectionNumber || t.id === "lca_impacts")
    );
    return {
      phaseId: "phase4_lca",
      tableId: match?.id ?? (sectionNumber === lcaTable.section ? lcaTable.id : null),
    };
  }

  if (/^5$/.test(sectionNumber) && /verif/i.test(title)) {
    return { phaseId: "phase2", tableId: null };
  }

  if (sectionNumber.startsWith("5") && titleMatches(title, /system\s*boundar/i)) {
    return { phaseId: "phase3_lca_study", tableId: null };
  }

  return { phaseId: null, tableId: null };
}

/** Stable unique key for React / URL hash (section `number` may repeat in docmap). */
export function buildNavSectionId(
  parentPath: string,
  number: string,
  page: number | null,
  siblingIndex: number
): string {
  const segment = number.replace(/\//g, "_");
  let id = parentPath ? `${parentPath}/${segment}` : segment;
  if (siblingIndex > 0) {
    id += page != null ? `~p${page}` : `~${siblingIndex}`;
  }
  return id;
}

function filterDocmapTree<
  T extends {
    number: string;
    title: string;
    page: number | null;
    level: number;
    children?: T[];
  },
>(nodes: T[]): T[] {
  const out: T[] = [];
  for (const node of nodes) {
    if (!isValidSectionNumber(node.number)) continue;
    if (isJunkDocmapEntry(node.number, node.title)) continue;
    const children = node.children?.length ? filterDocmapTree(node.children) : undefined;
    out.push({ ...node, children });
  }
  return out;
}

function mapNavNode(
  node: {
    number: string;
    title: string;
    page: number | null;
    level: number;
    children?: Array<{
      number: string;
      title: string;
      page: number | null;
      level: number;
      children?: unknown[];
    }>;
  },
  phases: ResolvedPhase[],
  tables: TableExportDef[],
  exportedTableIds: Set<string>,
  content: EpdContentContext,
  pdfAvailable: boolean,
  sectionViewTemplate: SectionViewTemplate,
  parentPath = "",
  siblingIndex = 0
): SectionNavItem {
  const title = navSectionTitle(node.title, node.number);
  const { phaseId, tableId } = resolveSectionBinding(node.number, title, tables);
  const id = buildNavSectionId(parentPath, node.number, node.page, siblingIndex);
  const draftItem: SectionNavItem = {
    id,
    number: node.number,
    title,
    page: node.page,
    level: node.level,
    phaseId,
    tableId,
    status: "pending",
    availability: {
      hasPdfLink: false,
      hasExtractedContent: false,
      hasVisualExport: false,
      pendingMessage: null,
    },
  };
  const availability = resolveSectionAvailability(
    draftItem,
    content,
    pdfAvailable,
    sectionViewTemplate
  );
  const status = sectionStatusFromAvailability(availability);

  return {
    id,
    number: node.number,
    title,
    page: node.page,
    level: node.level,
    phaseId,
    tableId,
    status,
    availability: {
      hasPdfLink: availability.hasPdfLink,
      hasExtractedContent: availability.hasExtractedContent,
      hasVisualExport: availability.hasVisualExport,
      pendingMessage: availability.pendingMessage,
    },
    children: node.children?.length
      ? node.children.map((child, idx) =>
          mapNavNode(
            child as SectionNavItem & { children?: unknown[] },
            phases,
            tables,
            exportedTableIds,
            content,
            pdfAvailable,
            sectionViewTemplate,
            id,
            idx
          )
        )
      : undefined,
  };
}

export function parentIdsWithChildren(items: SectionNavItem[]): string[] {
  const ids: string[] = [];
  function walk(nodes: SectionNavItem[]) {
    for (const node of nodes) {
      if (node.children?.length) {
        ids.push(node.id);
        walk(node.children);
      }
    }
  }
  walk(items);
  return ids;
}

export function ancestorIdsForActive(items: SectionNavItem[], activeId: string): string[] {
  const out: string[] = [];
  function walk(nodes: SectionNavItem[]): boolean {
    for (const node of nodes) {
      if (node.id === activeId) return true;
      if (node.children?.length && walk(node.children)) {
        out.push(node.id);
        return true;
      }
    }
    return false;
  }
  walk(items);
  return out;
}

export function flattenNavItems(items: SectionNavItem[]): SectionNavItem[] {
  const out: SectionNavItem[] = [];
  for (const item of items) {
    out.push(item);
    if (item.children?.length) out.push(...flattenNavItems(item.children));
  }
  return out;
}

function pickDefaultSection(items: SectionNavItem[]): string | null {
  const flat = flattenNavItems(items);
  const header = flat.find((item) => item.id === "__header__");
  if (header) return header.id;

  const ready = flat.find((item) => item.status === "ready" && item.phaseId);
  if (ready) return ready.id;
  const visual = flat.find((item) => item.status === "visual_only");
  if (visual) return visual.id;
  return flat[0]?.id ?? null;
}

/** Group root-level 11.1 / 11.2 when the TOC omits parent section 11. */
function nestOrphanSection11Items(
  items: SectionNavItem[],
  content: EpdContentContext,
  pdfAvailable: boolean,
  sectionViewTemplate: SectionViewTemplate
): SectionNavItem[] {
  if (items.some((i) => i.number === "11")) return items;

  const elevens: SectionNavItem[] = [];
  const rest: SectionNavItem[] = [];
  let insertAt = -1;

  for (const item of items) {
    if (/^11\.\d+/.test(item.number)) {
      if (insertAt < 0) insertAt = rest.length;
      elevens.push(item);
    } else {
      rest.push(item);
    }
  }

  if (!elevens.length) return items;

  const parentId = "11";
  const parentDraft: SectionNavItem = {
    id: parentId,
    number: "11",
    title: "Additional environmental information",
    page: elevens[0]!.page,
    level: 1,
    phaseId: "phase7_epd_sections",
    tableId: null,
    status: "pending",
    availability: {
      hasPdfLink: false,
      hasExtractedContent: false,
      hasVisualExport: false,
      pendingMessage: null,
    },
    children: elevens.map((child, idx) => ({
      ...child,
      id: buildNavSectionId(parentId, child.number, child.page, idx),
      level: 2,
    })),
  };
  const parentAvailability = resolveSectionAvailability(
    parentDraft,
    content,
    pdfAvailable,
    sectionViewTemplate
  );
  const parent: SectionNavItem = {
    ...parentDraft,
    status: sectionStatusFromAvailability(parentAvailability),
    availability: {
      hasPdfLink: parentAvailability.hasPdfLink,
      hasExtractedContent: parentAvailability.hasExtractedContent,
      hasVisualExport: parentAvailability.hasVisualExport,
      pendingMessage: parentAvailability.pendingMessage,
    },
  };

  rest.splice(insertAt, 0, parent);
  return rest;
}

export function buildSectionNav(input: {
  docmapEntries: Array<{
    number: string;
    title: string;
    page: number | null;
    level: number;
    children?: unknown[];
  }>;
  flatEntries: Array<{
    number: string;
    title: string;
    page: number | null;
    level: number;
  }>;
  phases: ResolvedPhase[];
  tables: TableExportDef[];
  exportedTableIds: string[];
  hasDraft: boolean;
  content: EpdContentContext;
  pdfAvailable: boolean;
  sectionViewTemplate: SectionViewTemplate;
}): SectionNavTree {
  const exported = new Set(input.exportedTableIds);
  const phases = input.phases;
  const { content, pdfAvailable, sectionViewTemplate } = input;

  const items: SectionNavItem[] = [];

  if (input.pdfAvailable || input.hasDraft) {
    const headerItem: SectionNavItem = {
      id: "__header__",
      number: "—",
      title: "Cover & declaration",
      page: coverPdfPage(input.content.phase2),
      level: 1,
      phaseId: "phase2",
      tableId: null,
      status: "pending",
      availability: {
        hasPdfLink: false,
        hasExtractedContent: false,
        hasVisualExport: false,
        pendingMessage: null,
      },
    };
    const headerAvailability = resolveSectionAvailability(
      headerItem,
      content,
      pdfAvailable,
      sectionViewTemplate
    );
    items.push({
      ...headerItem,
      status: sectionStatusFromAvailability(headerAvailability),
      availability: {
        hasPdfLink: headerAvailability.hasPdfLink,
        hasExtractedContent: headerAvailability.hasExtractedContent,
        hasVisualExport: headerAvailability.hasVisualExport,
        pendingMessage: headerAvailability.pendingMessage,
      },
    });
  }

  const rawEntries = input.flatEntries.length
    ? buildTocTree(input.flatEntries)
    : input.docmapEntries;
  const sourceEntries = filterDocmapTree(rawEntries as TocNode[]);

  for (const [index, entry] of sourceEntries.entries()) {
    items.push(
      mapNavNode(
        entry,
        phases,
        input.tables,
        exported,
        content,
        pdfAvailable,
        sectionViewTemplate,
        "",
        index
      )
    );
  }

  const navItems = nestOrphanSection11Items(
    items,
    content,
    pdfAvailable,
    sectionViewTemplate
  );

  return {
    items: navItems,
    defaultSectionId: pickDefaultSection(navItems),
  };
}

export function findSectionById(
  items: SectionNavItem[],
  id: string
): SectionNavItem | null {
  for (const item of items) {
    if (item.id === id) return item;
    if (item.children?.length) {
      const found = findSectionById(item.children, id);
      if (found) return found;
    }
  }
  return null;
}

export function parseSectionHash(hash: string): string | null {
  const match = hash.match(/^#section-(.+)$/);
  if (!match) return null;
  let id = decodeURIComponent(match[1]).trim();
  const junk = id.match(/^(.+?)(?:\+\+|#).*/);
  if (junk?.[1]) id = junk[1].trim();
  return id;
}

/** Narrow index column: main sections only (`1`, `2`, `11`); sub-sections (`1.2`) leave it blank. */
export function navIndexLabel(sectionNumber: string): string {
  if (sectionNumber === "—" || !sectionNumber.trim()) return "";
  const parts = sectionNumber.split(".").filter(Boolean);
  if (parts.length !== 1) return "";
  return parts[0] ?? "";
}

export function sectionHash(id: string): string {
  return `#section-${encodeURIComponent(id)}`;
}
