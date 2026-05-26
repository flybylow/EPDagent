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

export interface EpdRecord {
  stem: string;
  pdfFilename: string | null;
  hasPdf: boolean;
  isDemoFixture: boolean;
  needsExtraction: boolean;
  referenceId: string | null;
  referenceLabel: string | null;
  phase1: Phase1Data | null;
  phase2: Phase2Data | null;
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
