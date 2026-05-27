export interface TableExportDef {
  id: string;
  title: string;
  phase: string;
  page: number;
  /** Optional wider page range for Claude probe (e.g. table + explanatory text). */
  probePages?: string;
  section?: string;
  notes?: string;
}

export interface TableExportManifest {
  stem: string;
  pdfFilename: string;
  exportedAt: string;
  tables: Array<
    TableExportDef & {
      image: string;
      imageBytes: number;
    }
  >;
}
