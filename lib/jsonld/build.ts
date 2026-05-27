import type { EpdGraphInput } from "../graph/input";
import { epdIri, epdPartIri, operatorIri, orgIri, personIri } from "../iri";
import type {
  JsonLdNode,
  Phase3LcaStudyData,
  Phase3ProductData,
  Phase4LcaProbeData,
} from "../types";
import { JSONLD_CONTEXT } from "./context";

function ref(id: string): JsonLdNode {
  return { "@id": id };
}

function omitNulls<T extends Record<string, unknown>>(obj: T): T {
  const out = { ...obj };
  for (const key of Object.keys(out)) {
    if (out[key] === null || out[key] === undefined) delete out[key];
  }
  return out;
}

function addProductSection(
  epdId: string,
  epdNode: JsonLdNode,
  nodes: JsonLdNode[],
  phase3: Phase3ProductData | null
): void {
  if (!phase3) return;
  const id = epdPartIri(epdId, "product");
  const productNode: JsonLdNode = omitNulls({
    "@id": id,
    "@type": "ProductSection",
    description: phase3.description,
    intendedUse: phase3.intended_use,
    installation: phase3.installation,
    referenceServiceLifeYears: phase3.reference_service_life_years,
    geographicalRepresentativity: phase3.geographical_representativity,
    productionProcess: phase3.production_process,
    referenceFlow: phase3.reference_flow?.value != null || phase3.reference_flow?.unit
      ? {
          "@type": "schema:QuantitativeValue",
          "schema:value": phase3.reference_flow.value,
          "schema:unitCode": phase3.reference_flow.unit,
          description: phase3.reference_flow.description,
        }
      : phase3.reference_flow?.description
        ? { description: phase3.reference_flow.description }
        : undefined,
    technicalProperties: phase3.technical_properties?.length
      ? phase3.technical_properties
      : undefined,
  });
  nodes.push(productNode);
  epdNode.productSection = ref(id);
}

function addComposition(
  epdId: string,
  epdNode: JsonLdNode,
  nodes: JsonLdNode[],
  input: EpdGraphInput
): void {
  const data = input.phase3Composition;
  if (!data?.components.length && !data?.declarations?.length) return;
  const id = epdPartIri(epdId, "composition");
  nodes.push(
    omitNulls({
      "@id": id,
      "@type": "Composition",
      components: data.components,
      declarations: data.declarations?.length ? data.declarations : undefined,
    })
  );
  epdNode.composition = ref(id);
}

function lcaStudyFields(data: Phase3LcaStudyData): Record<string, unknown> {
  return omitNulls({
    sectionTitle: data.section_title,
    standardsAndMethodology: data.standards_and_methodology,
    pcrReference: data.pcr_reference,
    lcaSoftwareAndDatabase: data.lca_software_and_database,
    goalAndScope: data.goal_and_scope,
    functionalUnit: data.functional_unit,
    systemBoundaries: data.system_boundaries,
    productionSites: data.production_sites,
    cutOffCriteria: data.cut_off_criteria,
    allocation: data.allocation,
    dataQuality: data.data_quality,
    timeRepresentativeness: data.time_representativeness,
    geographicalRepresentativeness: data.geographical_representativeness,
    technologyRepresentativeness: data.technology_representativeness,
    impactAssessment: data.impact_assessment,
    interpretation: data.interpretation,
    additionalParagraphs: data.additional_paragraphs?.length ? data.additional_paragraphs : undefined,
    subsections: data.subsections?.length ? data.subsections : undefined,
  });
}

function addLcaStudy(
  epdId: string,
  epdNode: JsonLdNode,
  nodes: JsonLdNode[],
  input: EpdGraphInput
): void {
  const data = input.phase3LcaStudy;
  if (!data) return;
  const fields = lcaStudyFields(data);
  if (Object.keys(fields).length <= 0) return;
  const id = epdPartIri(epdId, "lca-study");
  nodes.push({ "@id": id, "@type": "LcaStudy", ...fields });
  epdNode.lcaStudy = ref(id);
}

function addLcaTables(
  epdId: string,
  epdNode: JsonLdNode,
  nodes: JsonLdNode[],
  probes: Record<string, Phase4LcaProbeData>
): void {
  const refs: JsonLdNode[] = [];
  for (const [tableId, probe] of Object.entries(probes)) {
    const id = epdPartIri(epdId, `lca-table/${tableId}`);
    nodes.push(
      omitNulls({
        "@id": id,
        "@type": "LcaTable",
        tableKey: tableId,
        tableTitle: probe.table_title,
        tableType: probe.table_type,
        introductoryText: probe.introductory_text,
        columnGroups: probe.column_groups?.length ? probe.column_groups : undefined,
        columns: probe.columns?.length ? probe.columns : undefined,
        rows: probe.rows?.length ? probe.rows : undefined,
        capture: probe.capture,
      })
    );
    refs.push(ref(id));
  }
  if (refs.length) epdNode.lcaTables = refs;
}

function addScenarios(
  epdId: string,
  epdNode: JsonLdNode,
  nodes: JsonLdNode[],
  input: EpdGraphInput
): void {
  const data = input.phase5;
  if (!data?.scenarios.length) return;
  const id = epdPartIri(epdId, "scenarios");
  nodes.push(
    omitNulls({
      "@id": id,
      "@type": "ScenarioSet",
      sectionTitle: data.section_title,
      scenarios: data.scenarios,
    })
  );
  epdNode.scenarios = ref(id);
}

function addReferences(
  epdId: string,
  epdNode: JsonLdNode,
  nodes: JsonLdNode[],
  input: EpdGraphInput
): void {
  const data = input.phase6;
  if (!data?.bibliography.length && !data?.additional_information?.length) return;
  const id = epdPartIri(epdId, "references");
  nodes.push(
    omitNulls({
      "@id": id,
      "@type": "Bibliography",
      bibliography: data.bibliography,
      additionalInformation: data.additional_information?.length
        ? data.additional_information
        : undefined,
    })
  );
  epdNode.bibliography = ref(id);
}

function addEpdSections(
  epdId: string,
  epdNode: JsonLdNode,
  nodes: JsonLdNode[],
  input: EpdGraphInput
): void {
  const data = input.phase7;
  if (!data?.blocks.length) return;
  const id = epdPartIri(epdId, "sections");
  nodes.push({
    "@id": id,
    "@type": "EpdSectionSet",
    blocks: data.blocks,
  });
  epdNode.epdSections = ref(id);
}

function extractionCoverage(input: EpdGraphInput): Record<string, unknown> {
  return {
    phase1: Boolean(input.phase1),
    phase2: Boolean(input.phase2),
    phase3_product: Boolean(input.phase3),
    phase3_composition: Boolean(
      input.phase3Composition?.components.length || input.phase3Composition?.declarations?.length
    ),
    phase3_lca_study: Boolean(input.phase3LcaStudy),
    phase4_lca: Object.keys(input.phase4Probes),
    phase5_scenarios: Boolean(input.phase5?.scenarios.length),
    phase6_refs: Boolean(
      input.phase6?.bibliography.length || input.phase6?.additional_information?.length
    ),
    phase7_epd_sections: Boolean(input.phase7?.blocks.length),
  };
}

export function buildEpdGraph(input: EpdGraphInput): JsonLdNode[] {
  const { stem, phase1, phase2 } = input;
  const nodes: JsonLdNode[] = [];
  const epdId = epdIri(stem);
  const epdNumber = phase2?.epd_number ?? phase1?.epd_number ?? null;

  const epdNode: JsonLdNode = {
    "@id": epdId,
    "@type": ["EPD", "schema:Product"],
    epdNumber,
    "schema:name": phase2?.product_name ?? epdNumber ?? stem,
  };

  if (phase2?.product_description) {
    epdNode["schema:description"] = phase2.product_description;
  }
  if (phase2?.standards_conformity) epdNode.standardsConformity = phase2.standards_conformity;
  if (phase2?.verification_statement) epdNode.verificationStatement = phase2.verification_statement;
  if (phase2?.conformity_basis) epdNode.conformityBasis = phase2.conformity_basis;
  if (phase2?.declared_scope) epdNode.declaredScope = phase2.declared_scope;
  if (phase2?.declared_modules?.length) epdNode.declaredModules = phase2.declared_modules;

  if (phase1?.language) epdNode.language = phase1.language;
  if (phase1?.pattern) epdNode.filenamePattern = phase1.pattern;

  if (phase2?.declared_unit?.value != null || phase2?.declared_unit?.unit) {
    epdNode.declaredUnit = {
      "@type": "schema:QuantitativeValue",
      "schema:value": phase2?.declared_unit?.value ?? null,
      "schema:unitCode": phase2?.declared_unit?.unit ?? null,
    };
  }
  if (phase2?.validity?.issued) epdNode["schema:validFrom"] = phase2.validity.issued;
  if (phase2?.validity?.valid_until) epdNode["schema:validThrough"] = phase2.validity.valid_until;
  if (phase2?.pcr_reference) epdNode.pcrReference = phase2.pcr_reference;

  const operatorId = operatorIri(phase2?.program_operator_code ?? phase2?.program_operator);
  if (operatorId) {
    nodes.push({
      "@id": operatorId,
      "@type": "ProgramOperator",
      "schema:name": phase2?.program_operator,
      operatorCode: phase2?.program_operator_code ?? null,
    });
    epdNode.programOperator = ref(operatorId);
  }

  const producerId = orgIri(phase2?.producer?.name);
  if (producerId) {
    nodes.push({
      "@id": producerId,
      "@type": "schema:Organization",
      "schema:name": phase2?.producer?.name,
      "schema:address": phase2?.producer?.address,
      "schema:addressCountry": phase2?.producer?.country,
    });
    epdNode.producer = ref(producerId);
  }

  const verifierId = personIri(phase2?.verifier?.name);
  if (verifierId) {
    nodes.push({
      "@id": verifierId,
      "@type": "schema:Person",
      "schema:name": phase2?.verifier?.name,
      verificationType: phase2?.verifier?.type,
    });
    epdNode.verifier = ref(verifierId);
  }

  const pdfFilename =
    (phase2?._source?.pdf_filename as string | undefined) ??
    phase1?.pdf_filename ??
    `${stem}.pdf`;

  epdNode["prov:wasDerivedFrom"] = {
    "@type": "prov:Entity",
    "schema:name": pdfFilename,
  };

  const generatedAt =
    (phase2?._source?.extracted_at as string | undefined) ??
    (phase1?._source?.extracted_at as string | undefined);
  if (generatedAt) epdNode["prov:generatedAtTime"] = generatedAt;

  addProductSection(epdId, epdNode, nodes, input.phase3);
  addComposition(epdId, epdNode, nodes, input);
  addLcaStudy(epdId, epdNode, nodes, input);
  addLcaTables(epdId, epdNode, nodes, input.phase4Probes);
  addScenarios(epdId, epdNode, nodes, input);
  addReferences(epdId, epdNode, nodes, input);
  addEpdSections(epdId, epdNode, nodes, input);

  epdNode.extractionCoverage = extractionCoverage(input);

  nodes.unshift(epdNode);
  return nodes;
}

export function toJsonLdDocument(graph: JsonLdNode[]) {
  return {
    "@context": JSONLD_CONTEXT,
    "@graph": graph,
  };
}

export function toCorpusDocument(allGraphs: JsonLdNode[][]) {
  return {
    "@context": JSONLD_CONTEXT,
    "@graph": allGraphs.flat(),
  };
}
