import {
  loadPhase2,
  loadPhase3,
  loadPhase3Composition,
  loadPhase3LcaStudy,
  resolveCorpusStem,
} from "../data";
import { loadPhase4Probes } from "../extract/phase4-probes";
import { epdIri } from "../iri";
import { buildLcaIndicators, pickPrimaryGwp } from "./lca-slice";
import { inferProductTags, isThermalProperty } from "./tags";
import type {
  FactPart,
  ProductFacts,
  ProductFactsComposition,
  ProductFactsIdentity,
  ProductFactsLca,
  ProductFactsProduct,
  ProductFactsThermal,
} from "./types";
import { FACT_PARTS } from "./types";

export function parseFactParts(
  raw: string | null,
  defaultParts: readonly FactPart[] = FACT_PARTS
): Set<FactPart> {
  if (!raw?.trim()) return new Set(defaultParts);
  const wanted = new Set<FactPart>();
  for (const token of raw.split(",")) {
    const p = token.trim().toLowerCase() as FactPart;
    if ((FACT_PARTS as readonly string[]).includes(p)) wanted.add(p);
  }
  return wanted.size ? wanted : new Set(defaultParts);
}

function availableParts(stem: string): FactPart[] {
  const parts: FactPart[] = ["identity"];
  if (loadPhase2(stem) || loadPhase3(stem)) parts.push("product");
  const p3 = loadPhase3(stem);
  if (p3?.technical_properties?.some(isThermalProperty)) parts.push("thermal");
  if (Object.keys(loadPhase4Probes(stem)).length) parts.push("lca");
  if (loadPhase3Composition(stem)) parts.push("composition");
  return parts;
}

export function buildProductFacts(
  rawStem: string,
  parts: Set<FactPart>
): ProductFacts | null {
  const stem = resolveCorpusStem(rawStem);
  const phase2 = loadPhase2(stem);
  const phase3 = loadPhase3(stem);
  if (!phase2 && !phase3) return null;

  const avail = availableParts(stem);
  const iri = epdIri(stem);
  const out: ProductFacts = {
    schema: "epdagent.product-facts.v1",
    stem,
    iri,
    available: avail,
  };

  if (parts.has("identity")) {
    const identity: ProductFactsIdentity = {
      stem,
      iri,
      epd_number: phase2?.epd_number ?? null,
      product_name: phase2?.product_name ?? null,
      producer: phase2?.producer?.name ?? null,
      program_operator: phase2?.program_operator ?? null,
      program_operator_code: phase2?.program_operator_code ?? null,
    };
    out.identity = identity;
  }

  if (parts.has("product") && (phase2 || phase3)) {
    const product: ProductFactsProduct = {
      description: phase3?.description ?? phase2?.product_description ?? null,
      intended_use: phase3?.intended_use ?? null,
      reference_flow: phase3?.reference_flow ?? null,
      reference_service_life_years: phase3?.reference_service_life_years ?? null,
      tags: inferProductTags(phase2, phase3),
    };
    out.product = product;
  }

  if (parts.has("thermal") && phase3?.technical_properties?.length) {
    const thermal: ProductFactsThermal = {
      properties: phase3.technical_properties.filter(isThermalProperty),
    };
    if (thermal.properties.length) out.thermal = thermal;
  }

  if (parts.has("lca")) {
    const probes = loadPhase4Probes(stem);
    if (Object.keys(probes).length) {
      const indicators = buildLcaIndicators(probes);
      const lcaStudy = loadPhase3LcaStudy(stem);
      const lca: ProductFactsLca = {
        declared_unit: phase2?.declared_unit ?? { value: null, unit: null },
        functional_unit: lcaStudy?.functional_unit ?? null,
        indicators,
      };
      const gwp = pickPrimaryGwp(indicators);
      if (gwp && !lca.indicators.gwp_total) {
        lca.indicators.gwp_total = gwp;
      }
      out.lca = lca;
    }
  }

  if (parts.has("composition")) {
    const comp = loadPhase3Composition(stem);
    if (comp?.components?.length) {
      const composition: ProductFactsComposition = {
        components: comp.components.map((c) => ({
          section: c.section,
          component: c.component,
          composition: c.composition,
          quantity: c.quantity,
        })),
      };
      out.composition = composition;
    }
  }

  return out;
}
