import {
  isBibliographySection,
  isPhase7NarrativeSection,
  titleMatches,
} from "../navigation/title-match";
import type { SectionViewDef } from "./section-view-types";
import type { TemplateFieldDef } from "./types";

type FieldPath =
  | "phase3LcaStudy.lca_software_and_database"
  | "phase3LcaStudy.allocation"
  | "phase3LcaStudy.cut_off_criteria"
  | "phase3LcaStudy.time_representativeness"
  | "phase3LcaStudy.data_quality"
  | "phase3LcaStudy.system_boundaries"
  | "phase3LcaStudy.production_sites"
  | "phase3LcaStudy.standards_and_methodology"
  | "phase3LcaStudy.pcr_reference"
  | "phase3LcaStudy.goal_and_scope"
  | "phase3LcaStudy.functional_unit"
  | "phase3LcaStudy.impact_assessment"
  | "phase3LcaStudy.interpretation"
  | "phase3LcaStudy._subsection";

const TITLE_FIELD_RULES: Array<{
  pattern: RegExp;
  path: FieldPath;
  label?: string;
}> = [
  { pattern: /software/i, path: "phase3LcaStudy.lca_software_and_database", label: "LCA software" },
  {
    pattern: /database|background data/i,
    path: "phase3LcaStudy.lca_software_and_database",
    label: "Database",
  },
  { pattern: /allocation/i, path: "phase3LcaStudy.allocation" },
  { pattern: /cut.?off|excluded process/i, path: "phase3LcaStudy.cut_off_criteria" },
  {
    pattern: /period of data|date of lca|data collection/i,
    path: "phase3LcaStudy.time_representativeness",
  },
  { pattern: /data collection|data quality|specificity/i, path: "phase3LcaStudy.data_quality" },
  {
    pattern: /biogenic carbon|carbon modelling|carbon modeling/i,
    path: "phase3LcaStudy._subsection",
    label: "Biogenic carbon",
  },
  {
    pattern: /carbon offset/i,
    path: "phase3LcaStudy._subsection",
    label: "Carbon offsetting",
  },
  {
    pattern: /variability|uncertainty/i,
    path: "phase3LcaStudy._subsection",
    label: "Variability",
  },
  { pattern: /energy mix/i, path: "phase3LcaStudy._subsection", label: "Energy mix" },
  {
    pattern: /interpretation|lca interpretation/i,
    path: "phase3LcaStudy.interpretation",
    label: "Interpretation",
  },
  { pattern: /system boundar/i, path: "phase3LcaStudy.system_boundaries" },
  { pattern: /production site/i, path: "phase3LcaStudy.production_sites" },
  { pattern: /pcr|product category/i, path: "phase3LcaStudy.pcr_reference" },
  { pattern: /goal|scope/i, path: "phase3LcaStudy.goal_and_scope" },
  { pattern: /functional unit|declared unit/i, path: "phase3LcaStudy.functional_unit" },
  {
    pattern: /characterisation|characterization|impact assessment|lcia/i,
    path: "phase3LcaStudy.impact_assessment",
  },
  { pattern: /standard|methodology|conform/i, path: "phase3LcaStudy.standards_and_methodology" },
];

const NUMBER_FIELD_MAP: Record<string, FieldPath> = {
  "3.1": "phase3LcaStudy.time_representativeness",
  "3.2": "phase3LcaStudy.lca_software_and_database",
  "3.3": "phase3LcaStudy.allocation",
  "3.4": "phase3LcaStudy.cut_off_criteria",
  "3.6": "phase3LcaStudy._subsection",
  "3.7": "phase3LcaStudy._subsection",
  "3.9": "phase3LcaStudy._subsection",
  "3.11": "phase3LcaStudy.time_representativeness",
  "3.12": "phase3LcaStudy.data_quality",
  "3.13": "phase3LcaStudy.lca_software_and_database",
  "3.10": "phase3LcaStudy.data_quality",
  "3.14": "phase3LcaStudy._subsection",
};

const PRODUCT_SECTION_1: TemplateFieldDef[] = [
  { label: "Product description", path: "phase3.description", format: "text" },
  { label: "Intended use", path: "phase3.intended_use", format: "text" },
  {
    label: "Reference flow / declared unit",
    path: "phase3.reference_flow.description",
    format: "text",
  },
  { label: "Installation", path: "phase3.installation", format: "text" },
  {
    label: "Reference service life",
    path: "phase3.reference_service_life_years",
    format: "years",
  },
  {
    label: "Geographical representativity",
    path: "phase3.geographical_representativity",
    format: "text",
  },
  { label: "Production process", path: "phase3.production_process", format: "text" },
];

const PRODUCT_SUBSECTIONS: Record<string, TemplateFieldDef[]> = {
  "1.1": [{ label: "Product name", path: "phase2.product_name", format: "text" }],
  "1.2": [
    { label: "Product description", path: "phase3.description", format: "text" },
    { label: "Intended use", path: "phase3.intended_use", format: "text" },
  ],
  "1.3": [
    {
      label: "Reference flow / declared unit",
      path: "phase3.reference_flow.description",
      format: "text",
    },
  ],
  "1.4": [{ label: "Installation", path: "phase3.installation", format: "text" }],
  "1.5": [],
  "1.6": [
    {
      label: "Reference service life",
      path: "phase3.reference_service_life_years",
      format: "years",
    },
  ],
  "1.7": [
    {
      label: "Geographical representativity",
      path: "phase3.geographical_representativity",
      format: "text",
    },
  ],
  "1.8": [
    { label: "Production process", path: "phase3.production_process", format: "text" },
  ],
};

const VERIFICATION_FIELDS: TemplateFieldDef[] = [
  { label: "Verification statement", path: "phase2.verification_statement", format: "text" },
  { label: "Verifier", path: "phase2.verifier.name", format: "text" },
  {
    label: "Verification type",
    path: "phase2.verifier.type",
    format: "text",
    enumLabels: {
      independent_third_party: "Third party verified",
      internal: "Internal verification",
      unknown: "Unknown",
    },
  },
  { label: "Standards conformity", path: "phase2.standards_conformity", format: "text" },
  { label: "Conformity basis", path: "phase2.conformity_basis", format: "text" },
  { label: "Program operator", path: "phase2.program_operator", format: "text" },
  { label: "PCR reference", path: "phase2.pcr_reference", format: "text" },
];

function fieldView(path: FieldPath, label: string): SectionViewDef {
  return {
    fields: [{ label, path, format: "text" }],
  };
}

function fieldsView(fields: TemplateFieldDef[]): SectionViewDef {
  return { fields };
}

function lcaTableView(sectionId: string, title: string): SectionViewDef | null {
  if (/^4$/.test(sectionId) && titleMatches(title, /production\s*sites?/i)) {
    return fieldView("phase3LcaStudy.production_sites", title);
  }

  const bySection: Record<string, string> = {
    "6": "lca_impacts",
    "7": "lca_resource",
    "8": "lca_waste",
    "9": "lca_additional",
  };
  const tableId = bySection[sectionId];
  if (!tableId) return null;
  if (sectionId === "4" && /production site/i.test(title)) return null;
  if (/impact|resource|waste|output flow|additional/i.test(title) || bySection[sectionId]) {
    return { view: "phase4_lca", tableId };
  }
  return null;
}

/**
 * Default section-view mapping from docmap id + title (when not in section-view.json).
 */
export function inferSectionViewDef(sectionId: string, title: string): SectionViewDef | null {
  if (sectionId === "__header__") {
    return { view: "draft" };
  }

  if (sectionId === "1") {
    return fieldsView(PRODUCT_SECTION_1);
  }

  if (sectionId.startsWith("1.")) {
    if (sectionId === "1.5" || /composition/i.test(title)) {
      return { view: "phase3_composition", tableId: "composition" };
    }
    const fields = PRODUCT_SUBSECTIONS[sectionId];
    if (fields?.length) return fieldsView(fields);
    if (/product name/i.test(title)) {
      return fieldsView(PRODUCT_SUBSECTIONS["1.1"]!);
    }
    if (/intended use/i.test(title)) {
      return fieldsView([{ label: "Intended use", path: "phase3.intended_use", format: "text" }]);
    }
    return null;
  }

  if (sectionId === "2" || (/^2$/.test(sectionId) && /technical/i.test(title))) {
    return { view: "phase3_technical", tableId: "technical_data" };
  }

  if (/^5$/.test(sectionId)) {
    if (/verif/i.test(title)) return fieldsView(VERIFICATION_FIELDS);
    if (titleMatches(title, /system\s*boundar/i)) {
      return fieldView("phase3LcaStudy.system_boundaries", title);
    }
  }

  if (/^4$/.test(sectionId) && titleMatches(title, /production\s*sites?/i)) {
    return fieldView("phase3LcaStudy.production_sites", title);
  }

  if (
    /^14$/.test(sectionId) &&
    /technical information|scenario development/i.test(title)
  ) {
    return { view: "phase5_scenarios" };
  }

  if (sectionId === "3") {
    return { view: "phase3_lca_study" };
  }

  if (sectionId.startsWith("3.")) {
    const byNumber = NUMBER_FIELD_MAP[sectionId];
    if (byNumber) {
      return fieldView(byNumber, title);
    }

    for (const rule of TITLE_FIELD_RULES) {
      if (rule.pattern.test(title)) {
        return fieldView(rule.path, rule.label ?? title);
      }
    }

    return fieldView("phase3LcaStudy._subsection", title);
  }

  const lcaTable = lcaTableView(sectionId, title);
  if (lcaTable) return lcaTable;

  if (sectionId === "10") {
    return { view: "phase5_scenarios" };
  }

  if (sectionId.startsWith("10.")) {
    return { view: "phase5_scenario" };
  }

  if (isPhase7NarrativeSection(sectionId, title)) {
    return { view: "phase7_section" };
  }

  if (isBibliographySection(sectionId, title)) {
    return { view: "phase6_refs" };
  }

  const lcaIntroTableId = lcaIntroTableForSection(sectionId, title);
  if (lcaIntroTableId) {
    return { view: "phase4_lca_intro", tableId: lcaIntroTableId };
  }

  return null;
}

/** Narrative subsections tied to an LCA results table (e.g. 9.1). */
function lcaIntroTableForSection(sectionId: string, title: string): string | null {
  const bySection: Record<string, string> = {
    "9.1": "lca_additional",
  };
  if (bySection[sectionId]) return bySection[sectionId];

  const parent = sectionId.split(".")[0];
  if (!/^[6-9]$/.test(parent) || !sectionId.includes(".")) return null;
  if (!/explained|information|note|description|definitions/i.test(title)) return null;

  const byParent: Record<string, string> = {
    "6": "lca_impacts",
    "7": "lca_resource",
    "8": "lca_waste",
    "9": "lca_additional",
  };
  return byParent[parent] ?? null;
}
