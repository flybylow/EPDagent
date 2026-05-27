import { parseTypeList } from "./tags";
import type { CatalogSearchFilters, ProductType } from "./types";
import { PRODUCT_TYPES } from "./types";

export interface ParsedCatalogQuery {
  filters: CatalogSearchFilters;
  limit: number;
  offset: number;
}

function parseBool(raw: string | null): boolean | null {
  if (raw == null || raw === "") return null;
  const v = raw.trim().toLowerCase();
  if (v === "1" || v === "true" || v === "yes") return true;
  if (v === "0" || v === "false" || v === "no") return false;
  return null;
}

function addType(types: ProductType[], raw: string | null): void {
  const key = raw?.trim().toLowerCase();
  if (!key || !(PRODUCT_TYPES as readonly string[]).includes(key)) return;
  const t = key as ProductType;
  if (!types.includes(t)) types.push(t);
}

export function parseCatalogQuery(url: URL): ParsedCatalogQuery {
  const type = url.searchParams.get("type")?.trim().toLowerCase() ?? null;
  const tag = url.searchParams.get("tag")?.trim().toLowerCase() ?? null;
  const types = parseTypeList(url.searchParams.get("types"));
  addType(types, type);
  addType(types, tag);

  const limitRaw = Number(url.searchParams.get("limit") ?? "50");
  const offsetRaw = Number(url.searchParams.get("offset") ?? "0");
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(1, limitRaw), 100) : 50;
  const offset = Number.isFinite(offsetRaw) ? Math.max(0, offsetRaw) : 0;

  return {
    filters: {
      q: url.searchParams.get("q")?.trim() ?? null,
      type: type ?? tag,
      types,
      producer: url.searchParams.get("producer")?.trim() ?? null,
      has_thermal: parseBool(url.searchParams.get("has_thermal")),
      has_lca: parseBool(url.searchParams.get("has_lca")),
      hints: parseBool(url.searchParams.get("hints")) === true,
    },
    limit,
    offset,
  };
}
