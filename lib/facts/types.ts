import type { TechnicalPropertyRow } from "../types";

export const FACT_PARTS = [
  "identity",
  "product",
  "thermal",
  "lca",
  "composition",
] as const;

export type FactPart = (typeof FACT_PARTS)[number];

export interface ProductFactsIdentity {
  stem: string;
  iri: string;
  epd_number: string | null;
  product_name: string | null;
  producer: string | null;
  program_operator: string | null;
  program_operator_code: string | null;
}

export interface ProductFactsProduct {
  description: string | null;
  intended_use: string | null;
  reference_flow: {
    value: number | null;
    unit: string | null;
    description: string | null;
  } | null;
  reference_service_life_years: number | null;
  tags: string[];
}

export interface ProductFactsThermal {
  properties: TechnicalPropertyRow[];
}

export interface LcaIndicatorSlice {
  indicator: string;
  unit: string | null;
  modules: Record<string, string | null>;
  /** Sum of A1+A2+A3 when all three are numeric. */
  a1_a3: string | null;
}

export interface ProductFactsLca {
  declared_unit: { value: number | null; unit: string | null };
  functional_unit: string | null;
  indicators: Record<string, LcaIndicatorSlice>;
}

export interface ProductFactsComposition {
  components: Array<{
    section: string | null;
    component: string | null;
    composition: string | null;
    quantity: string | null;
  }>;
}

export interface ProductFacts {
  schema: "epdagent.product-facts.v1";
  stem: string;
  iri: string;
  available: FactPart[];
  identity?: ProductFactsIdentity;
  product?: ProductFactsProduct;
  thermal?: ProductFactsThermal;
  lca?: ProductFactsLca;
  composition?: ProductFactsComposition;
}
