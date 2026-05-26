export interface TableExportDef {
  id: string;
  title: string;
  phase: string;
  page: number;
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
