import type { TechnicalPropertyRow } from "../types";

/** Stable product categories for BIM / Tabulas filters. */
export const PRODUCT_TYPES = [
  "insulation",
  "gypsum",
  "concrete",
  "windows",
  "roofing",
  "paint",
  "masonry",
  "other",
] as const;

export type ProductType = (typeof PRODUCT_TYPES)[number];

export const FACT_PARTS = [
  "identity",
  "product",
  "thermal",
  "lca",
  "composition",
  "calculator",
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
  /** Highest-priority category for filters (insulation, gypsum, …). */
  primary_type: ProductType;
  types: ProductType[];
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

/** Normalized values for external thermal / carbon calculators (Tabulas). */
export interface CalculatorHints {
  thermal: {
    lambda_W_mK: number | null;
    property_label: string | null;
    standard: string | null;
    unit: string | null;
  } | null;
  carbon: {
    gwp_a1_a3: string | null;
    gwp_unit: string | null;
    declared_unit: string | null;
    functional_unit: string | null;
  } | null;
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
  calculator?: CalculatorHints;
}

export interface CatalogProductSummary {
  stem: string;
  product_name: string;
  epd_number: string | null;
  producer: string | null;
  primary_type: ProductType;
  types: ProductType[];
  tags: string[];
  has_thermal: boolean;
  has_lca: boolean;
  facts_url: string;
  calculator_url: string;
  /** Present when catalog search uses `hints=1`. */
  calculator_hints?: CalculatorHints;
}

export interface ProductCatalogResponse {
  schema: "epdagent.product-catalog.v2";
  count: number;
  total: number;
  limit: number;
  offset: number;
  filters: CatalogSearchFilters;
  products: CatalogProductSummary[];
}

export interface CatalogSearchFilters {
  q: string | null;
  type: string | null;
  types: string[];
  producer: string | null;
  has_thermal: boolean | null;
  has_lca: boolean | null;
  hints: boolean;
}

export interface ProductTypesResponse {
  schema: "epdagent.product-types.v1";
  types: Array<{
    id: ProductType;
    label: string;
    count: number;
  }>;
}
