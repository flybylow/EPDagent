export interface Phase1Data {
  pdf_filename: string;
  pdf_stem: string;
  epd_number: string | null;
  language: string | null;
  pattern: string | null;
  _source?: Record<string, unknown>;
}

export interface Phase2Data {
  epd_number: string | null;
  program_operator: string | null;
  program_operator_code: string | null;
  producer: {
    name: string | null;
    address: string | null;
    country: string | null;
  };
  product_name: string | null;
  product_description: string | null;
  standards_conformity: string | null;
  verification_statement: string | null;
  conformity_basis: string | null;
  declared_scope: string | null;
  declared_modules: string[] | null;
  declared_unit: {
    value: number | null;
    unit: string | null;
  };
  validity: {
    issued: string | null;
    valid_until: string | null;
  };
  pcr_reference: string | null;
  verifier: {
    name: string | null;
    type: string | null;
  };
  _source?: Record<string, unknown>;
}

export interface TechnicalPropertyRow {
  property: string | null;
  standard: string | null;
  value: string | null;
  unit: string | null;
  comment: string | null;
}

export interface Phase3ProductData {
  description: string | null;
  intended_use: string | null;
  reference_flow: {
    value: number | null;
    unit: string | null;
    description: string | null;
  };
  installation: string | null;
  reference_service_life_years: number | null;
  geographical_representativity: string | null;
  production_process: string | null;
  technical_properties: TechnicalPropertyRow[] | null;
  _source?: Record<string, unknown>;
}

export interface CompositionRow {
  section: string | null;
  component: string | null;
  composition: string | null;
  quantity: string | null;
}

export interface Phase3CompositionData {
  components: CompositionRow[];
  declarations: string[] | null;
  _source?: Record<string, unknown>;
}

export interface LcaStudySubsection {
  number: string | null;
  title: string | null;
  content: string | null;
}

export interface Phase3LcaStudyData {
  section_title: string | null;
  standards_and_methodology: string | null;
  pcr_reference: string | null;
  lca_software_and_database: string | null;
  goal_and_scope: string | null;
  functional_unit: string | null;
  system_boundaries: string | null;
  production_sites: string | null;
  cut_off_criteria: string | null;
  allocation: string | null;
  data_quality: string | null;
  time_representativeness: string | null;
  geographical_representativeness: string | null;
  technology_representativeness: string | null;
  impact_assessment: string | null;
  interpretation: string | null;
  additional_paragraphs: string[] | null;
  subsections: LcaStudySubsection[] | null;
  _source?: Record<string, unknown>;
}

export interface ScenarioEntry {
  module: string | null;
  number: string | null;
  title: string | null;
  description: string | null;
}

export interface Phase5ScenariosData {
  section_title: string | null;
  scenarios: ScenarioEntry[];
  _source?: Record<string, unknown>;
}

export interface Phase6RefsData {
  bibliography: string[];
  additional_information: string[] | null;
  _source?: Record<string, unknown>;
}

export interface EpdSectionBlock {
  number: string | null;
  title: string | null;
  content: string | null;
}

export interface Phase7EpdSectionsData {
  blocks: EpdSectionBlock[];
  _source?: Record<string, unknown>;
}

export interface LcaColumnGroup {
  label: string | null;
  column_codes: string[];
}

export interface LcaColumn {
  code: string | null;
  label: string | null;
  group: string | null;
}

export interface LcaCellValue {
  column_code: string | null;
  raw_value: string | null;
}

export interface LcaTableRow {
  indicator: string | null;
  unit: string | null;
  values: LcaCellValue[];
}

export interface LcaCaptureAssessment {
  headers_rotated: boolean;
  column_count: number;
  row_count: number;
  complete: boolean;
  notes: string | null;
}

export interface Phase4LcaProbeData {
  table_title: string | null;
  table_type: string | null;
  /** Narrative block explaining categories/modules (e.g. section 9.1). */
  introductory_text: string | null;
  column_groups: LcaColumnGroup[];
  columns: LcaColumn[];
  rows: LcaTableRow[];
  capture: LcaCaptureAssessment;
  _source?: Record<string, unknown>;
}

export type PipelinePhaseStatus = "ready" | "visual_only" | "pending" | "empty";

export interface PipelinePhaseSummary {
  id: string;
  shortLabel: string;
  name: string;
  status: PipelinePhaseStatus;
}

export interface SectionCoverageSummary {
  total: number;
  withData: number;
  pdfSide: number;
  gaps: number;
}

export interface ExtractRunSummary {
  apiRunnableCount: number;
  pendingCount: number;
  upToDate: boolean;
  pendingStepLabels: string[];
}

export interface EpdRecord {
  stem: string;
  pdfFilename: string | null;
  hasPdf: boolean;
  /** Stem used for /pdf/… URLs (basename on disk, may differ from corpus stem). */
  pdfServeStem: string | null;
  isDemoFixture: boolean;
  needsExtraction: boolean;
  referenceId: string | null;
  referenceLabel: string | null;
  phase1: Phase1Data | null;
  phase2: Phase2Data | null;
  pipelinePhases: PipelinePhaseSummary[];
  /** True when docmap has at least one TOC section. */
  hasDocmapIndex: boolean;
  sectionCoverage: SectionCoverageSummary | null;
  extractSummary: ExtractRunSummary;
  graphPath: string | null;
  draftPath: string | null;
  verificationPath: string | null;
  pdfPath: string | null;
}

export type JsonLdNode = Record<string, unknown>;

export interface JsonLdDocument {
  "@context": Record<string, unknown>;
  "@graph": JsonLdNode[];
}
