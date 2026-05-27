import { NextResponse } from "next/server";
import { listProductTypesCatalog } from "@/lib/facts/catalog";
import { withCors } from "@/lib/http/cors";

/** List product types present in the corpus with counts (for BIM filter UI). */
export async function GET(request: Request) {
  return withCors(request, NextResponse.json(listProductTypesCatalog()));
}

export async function OPTIONS(request: Request) {
  return withCors(request, new NextResponse(null, { status: 204 }));
}
