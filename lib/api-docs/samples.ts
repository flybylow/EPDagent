import { buildProductFacts, parseFactParts } from "../facts/build";
import {
  listProductTypesCatalog,
  searchProductCatalog,
} from "../facts/catalog";
import { parseCatalogQuery } from "../facts/catalog-query";
import type { ParsedCatalogQuery } from "../facts/catalog-query";

/** Stable EPD with thermal + LCA in the published corpus. */
export const API_DOC_EXAMPLE_STEM =
  "B-EPD_023.0011.007-02.00.00 Rockwool Rockfit Mono EN - signed";

export interface ApiDocExample {
  id: string;
  title: string;
  description: string;
  method: "GET";
  path: string;
  curl: string;
  response: unknown;
  status: number;
}

function catalogQuery(path: string, search: string): ParsedCatalogQuery {
  const url = new URL(`http://local${path}${search}`);
  return parseCatalogQuery(url);
}

export function buildApiDocExamples(base: string): ApiDocExample[] {
  const encStem = encodeURIComponent(API_DOC_EXAMPLE_STEM);

  const types = listProductTypesCatalog();
  const insulation = searchProductCatalog(
    catalogQuery("/api/products", "?type=insulation&has_thermal=true&hints=1&limit=3")
  );
  const facts = buildProductFacts(API_DOC_EXAMPLE_STEM, parseFactParts("calculator,thermal"));

  return [
    {
      id: "types",
      title: "Product types",
      description: "Categories in the corpus with counts — use for filter dropdowns in BIM pickers.",
      method: "GET",
      path: "/api/products/types",
      curl: `curl -s '${base}/api/products/types'`,
      response: types,
      status: 200,
    },
    {
      id: "products",
      title: "Search products (insulation)",
      description: "Filter by type, optional calculator hints (λ, GWP preview) per row.",
      method: "GET",
      path: "/api/products?type=insulation&has_thermal=true&hints=1&limit=3",
      curl: `curl -s '${base}/api/products?type=insulation&has_thermal=true&hints=1&limit=3'`,
      response: insulation,
      status: 200,
    },
    {
      id: "facts",
      title: "Product facts (calculator slice)",
      description: "Normalized thermal + carbon fields for an external U-value / embodied carbon calculator.",
      method: "GET",
      path: `/api/facts/${encStem}?parts=calculator,thermal`,
      curl: `curl -s '${base}/api/facts/${encStem}?parts=calculator,thermal'`,
      response: facts ?? { error: "No facts for example stem" },
      status: facts ? 200 : 404,
    },
  ];
}
