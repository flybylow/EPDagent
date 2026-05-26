import type { Phase1Data, Phase2Data, JsonLdNode } from "../types";
import { JSONLD_CONTEXT } from "./context";
import { epdIri, operatorIri, orgIri, personIri } from "../iri";

function ref(id: string): JsonLdNode {
  return { "@id": id };
}

export function buildEpdGraph(stem: string, phase1: Phase1Data | null, phase2: Phase2Data | null): JsonLdNode[] {
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
  if (phase2?.standards_conformity) {
    epdNode.standardsConformity = phase2.standards_conformity;
  }
  if (phase2?.verification_statement) {
    epdNode.verificationStatement = phase2.verification_statement;
  }
  if (phase2?.conformity_basis) {
    epdNode.conformityBasis = phase2.conformity_basis;
  }
  if (phase2?.declared_scope) {
    epdNode.declaredScope = phase2.declared_scope;
  }
  if (phase2?.declared_modules?.length) {
    epdNode.declaredModules = phase2.declared_modules;
  }

  if (phase1?.language) {
    epdNode.language = phase1.language;
  }
  if (phase1?.pattern) {
    epdNode.filenamePattern = phase1.pattern;
  }
  if (phase2?.declared_unit?.value != null || phase2?.declared_unit?.unit) {
    epdNode.declaredUnit = {
      "@type": "schema:QuantitativeValue",
      "schema:value": phase2?.declared_unit?.value ?? null,
      "schema:unitCode": phase2?.declared_unit?.unit ?? null,
    };
  }
  if (phase2?.validity?.issued) {
    epdNode["schema:validFrom"] = phase2.validity.issued;
  }
  if (phase2?.validity?.valid_until) {
    epdNode["schema:validThrough"] = phase2.validity.valid_until;
  }
  if (phase2?.pcr_reference) {
    epdNode.pcrReference = phase2.pcr_reference;
  }

  const operatorId = operatorIri(phase2?.program_operator);
  if (operatorId) {
    nodes.push({
      "@id": operatorId,
      "@type": "ProgramOperator",
      "schema:name": phase2?.program_operator,
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
  if (generatedAt) {
    epdNode["prov:generatedAtTime"] = generatedAt;
  }

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
