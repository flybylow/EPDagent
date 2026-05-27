import { NextResponse } from "next/server";
import { parseCatalogQuery } from "@/lib/facts/catalog-query";
import { searchProductCatalog } from "@/lib/facts/catalog";
import { withCors } from "@/lib/http/cors";

/**
 * Product catalog for Tabulas / BIM case study.
 *
 * Query params:
 * - type | tag — e.g. insulation (alias)
 * - types — comma-separated: insulation,gypsum
 * - q — name / producer / description search
 * - producer — substring on producer name
 * - has_thermal, has_lca — true|false|1|0
 * - hints=1 — include calculator_hints (λ, GWP A1–A3) per row
 * - limit (default 50, max 100), offset
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const result = searchProductCatalog(parseCatalogQuery(url));
  return withCors(request, NextResponse.json(result));
}

export async function OPTIONS(request: Request) {
  return withCors(request, new NextResponse(null, { status: 204 }));
}
