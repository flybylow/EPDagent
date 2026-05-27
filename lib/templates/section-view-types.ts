import type { TemplateFieldDef } from "./types";

export type SectionViewKind =
  | "draft"
  | "phase3_composition"
  | "phase3_technical"
  | "phase3_lca_study"
  | "phase4_lca"
  | "phase4_lca_intro"
  | "phase5_scenarios"
  | "phase5_scenario"
  | "phase6_refs"
  | "phase7_section";

export interface SectionViewDef {
  view?: SectionViewKind;
  tableId?: string;
  fields?: TemplateFieldDef[];
  pendingMessage?: string;
}

export interface SectionViewTemplate {
  id: string;
  version: string;
  title: string;
  sections: Record<string, SectionViewDef>;
}

export interface ResolvedSectionField {
  id: string;
  label: string;
  path: string;
  displayValue: string;
  empty: boolean;
}

export interface SectionAvailability {
  sectionId: string;
  pdfAvailable: boolean;
  pdfPage: number | null;
  hasPdfLink: boolean;
  hasExtractedContent: boolean;
  hasVisualExport: boolean;
  pendingMessage: string | null;
  view: SectionViewDef | null;
  fields: ResolvedSectionField[];
}
