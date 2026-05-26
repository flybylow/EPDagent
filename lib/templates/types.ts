import type { Phase1Data, Phase2Data } from "../types";

export interface TemplateFieldDef {
  id: string;
  label: string;
  path: string;
  format?: "text" | "date" | "date-eu" | "enum" | "list";
  enumLabels?: Record<string, string>;
}

export interface TemplateSectionDef {
  id: string;
  title: string;
  fields: TemplateFieldDef[];
}

export interface DraftTemplate {
  id: string;
  version: string;
  title: string;
  sections: TemplateSectionDef[];
}

export interface DraftField {
  id: string;
  label: string;
  path: string;
  value: string | number | string[] | null;
  displayValue: string;
  sourcePhase: "phase1" | "phase2" | null;
  empty: boolean;
}

export interface DraftSection {
  id: string;
  title: string;
  fields: DraftField[];
}

export interface DraftDocument {
  templateId: string;
  templateVersion: string;
  stem: string;
  title: string;
  pdfFilename: string | null;
  generatedAt: string;
  sections: DraftSection[];
}

export interface DraftManifest {
  stem: string;
  templateId: string;
  templateVersion: string;
  generatedAt: string;
  files: {
    draft: string;
    html: string;
  };
}

export interface FieldVerification {
  fieldId: string;
  label: string;
  draftValue: string | null;
  pdfValue: string | null;
  status: "match" | "mismatch" | "missing_in_draft" | "missing_in_pdf" | "unclear";
  note: string | null;
}

export interface VerificationResult {
  stem: string;
  verifiedAt: string;
  model: string;
  pdfAvailable: boolean;
  summary: {
    match: number;
    mismatch: number;
    unclear: number;
    missing: number;
  };
  fields: FieldVerification[];
  overallNote: string | null;
}

export interface MergedPhaseData {
  phase1: Phase1Data | null;
  phase2: Phase2Data | null;
}
