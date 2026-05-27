import * as fs from "node:fs";
import * as path from "node:path";
import { GRAPH_DIR, listEpdStems, loadPhase2, loadPhase3 } from "../data";
import { buildCalculatorHints } from "./calculator-hints";
import type { ParsedCatalogQuery } from "./catalog-query";
import {
  inferPrimaryType,
  inferProductTags,
  inferProductTypes,
  PRODUCT_TYPE_LABELS,
  productSearchText,
  recordMatchesType,
  recordMatchesTypes,
} from "./tags";
import type {
  CatalogProductSummary,
  CatalogSearchFilters,
  ProductCatalogResponse,
  ProductType,
  ProductTypesResponse,
} from "./types";
import { PRODUCT_TYPES } from "./types";

function hasGraph(stem: string): boolean {
  return fs.existsSync(path.join(GRAPH_DIR, `${stem}.jsonld`));
}

function matchesQuery(
  entry: CatalogProductSummary,
  searchText: string,
  filters: CatalogSearchFilters
): boolean {
  if (filters.types.length && !recordMatchesTypes(entry.types, filters.types)) {
    return false;
  }
  if (filters.type && !recordMatchesType(entry.types, filters.type)) {
    return false;
  }
  if (filters.producer) {
    const want = filters.producer.toLowerCase();
    if (!entry.producer?.toLowerCase().includes(want)) return false;
  }
  if (filters.has_thermal === true && !entry.has_thermal) return false;
  if (filters.has_thermal === false && entry.has_thermal) return false;
  if (filters.has_lca === true && !entry.has_lca) return false;
  if (filters.has_lca === false && entry.has_lca) return false;

  if (filters.q) {
    const q = filters.q.toLowerCase();
    const hay = [
      entry.product_name,
      entry.stem,
      entry.epd_number,
      entry.producer,
      searchText,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!hay.includes(q)) return false;
  }

  return true;
}

export function buildCatalogEntry(
  stem: string,
  options: { includeHints?: boolean } = {}
): CatalogProductSummary | null {
  const phase2 = loadPhase2(stem);
  const phase3 = loadPhase3(stem);
  if (!phase2 && !phase3) return null;

  const types = inferProductTypes(phase2, phase3, stem);
  const tags = inferProductTags(phase2, phase3, stem);
  const hasThermal = tags.includes("thermal-data") || types.includes("insulation");

  const entry: CatalogProductSummary = {
    stem,
    product_name: phase2?.product_name ?? stem,
    epd_number: phase2?.epd_number ?? null,
    producer: phase2?.producer?.name ?? null,
    primary_type: inferPrimaryType(types),
    types,
    tags,
    has_thermal: hasThermal,
    has_lca: hasGraph(stem),
    facts_url: `/api/facts/${encodeURIComponent(stem)}`,
    calculator_url: `/api/facts/${encodeURIComponent(stem)}?parts=calculator,thermal,lca`,
  };

  if (options.includeHints) {
    entry.calculator_hints = buildCalculatorHints(stem, phase2, phase3);
  }

  return entry;
}

export function searchProductCatalog(query: ParsedCatalogQuery): ProductCatalogResponse {
  const { filters, limit, offset } = query;
  const all: Array<{ entry: CatalogProductSummary; searchText: string }> = [];

  for (const stem of listEpdStems()) {
    const phase2 = loadPhase2(stem);
    const phase3 = loadPhase3(stem);
    const entry = buildCatalogEntry(stem, { includeHints: filters.hints });
    if (!entry) continue;
    all.push({
      entry,
      searchText: productSearchText(phase2, phase3, stem),
    });
  }

  const filtered = all.filter(({ entry, searchText }) =>
    matchesQuery(entry, searchText, filters)
  );

  const page = filtered.slice(offset, offset + limit).map(({ entry }) => entry);

  return {
    schema: "epdagent.product-catalog.v2",
    count: page.length,
    total: filtered.length,
    limit,
    offset,
    filters,
    products: page,
  };
}

export function listProductTypesCatalog(): ProductTypesResponse {
  const counts = new Map<ProductType, number>();
  for (const t of PRODUCT_TYPES) counts.set(t, 0);

  for (const stem of listEpdStems()) {
    const phase2 = loadPhase2(stem);
    const phase3 = loadPhase3(stem);
    const types = inferProductTypes(phase2, phase3, stem);
    for (const t of types) {
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }

  return {
    schema: "epdagent.product-types.v1",
    types: PRODUCT_TYPES.map((id) => ({
      id,
      label: PRODUCT_TYPE_LABELS[id],
      count: counts.get(id) ?? 0,
    })).filter((row) => row.count > 0 || row.id === "other"),
  };
}
