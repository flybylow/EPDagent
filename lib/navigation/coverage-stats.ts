import type { SectionNavItem } from "./sections";
import { flattenNavItems } from "./sections";

export interface SectionNavCoverageStats {
  total: number;
  withData: number;
  pdfSide: number;
  gaps: number;
}

export function isGapNavItem(item: SectionNavItem): boolean {
  const { hasPdfLink, hasExtractedContent, hasVisualExport } = item.availability;
  return hasPdfLink && !hasExtractedContent && !hasVisualExport;
}

export function sectionNavCoverageStats(items: SectionNavItem[]): SectionNavCoverageStats {
  const flat = flattenNavItems(items);
  let withData = 0;
  let pdfSide = 0;
  let gaps = 0;
  for (const item of flat) {
    if (item.availability.hasExtractedContent) withData++;
    else if (item.availability.hasPdfLink || item.availability.hasVisualExport) pdfSide++;
    if (isGapNavItem(item)) gaps++;
  }
  return { total: flat.length, withData, pdfSide, gaps };
}
