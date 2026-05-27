import type { EpdRecord } from "../types";

export interface CorpusPickerItem {
  stem: string;
  displayName: string;
  epdNumber: string | null;
  hasPdf: boolean;
  gaps: number;
  sectionsWithData: number;
  sectionsTotal: number;
  phasesReady: number;
  phasesTotal: number;
}

export function corpusPickerItemFromRecord(record: EpdRecord): CorpusPickerItem {
  const displayName =
    record.phase2?.product_name ??
    record.phase1?.epd_number ??
    record.pdfFilename?.replace(/\.pdf$/i, "") ??
    record.stem;

  const epdNumber = record.phase2?.epd_number ?? record.phase1?.epd_number ?? null;
  const cov = record.sectionCoverage;

  return {
    stem: record.stem,
    displayName,
    epdNumber,
    hasPdf: record.hasPdf,
    gaps: cov?.gaps ?? 0,
    sectionsWithData: cov?.withData ?? 0,
    sectionsTotal: cov?.total ?? 0,
    phasesReady: record.pipelinePhases.filter(
      (p) => p.status === "ready" || p.status === "visual_only"
    ).length,
    phasesTotal: record.pipelinePhases.length,
  };
}

export function corpusPickerItemsFromRecords(records: EpdRecord[]): CorpusPickerItem[] {
  return records
    .map(corpusPickerItemFromRecord)
    .sort((a, b) => a.displayName.localeCompare(b.displayName, undefined, { sensitivity: "base" }));
}
