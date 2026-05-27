import { NextResponse } from "next/server";
import { buildProductFacts, parseFactParts } from "@/lib/facts/build";
import { withCors } from "@/lib/http/cors";

async function resolveStem(params: Promise<{ stem: string[] }>): Promise<string> {
  const { stem: parts } = await params;
  return decodeURIComponent(parts.join("/"));
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ stem: string[] }> }
) {
  const stem = await resolveStem(params);
  const url = new URL(request.url);
  const parts = parseFactParts(url.searchParams.get("parts"));
  const facts = buildProductFacts(stem, parts);

  if (!facts) {
    return withCors(
      request,
      NextResponse.json({ error: "No product facts for this stem" }, { status: 404 })
    );
  }

  return withCors(request, NextResponse.json(facts));
}

export async function OPTIONS(request: Request) {
  return withCors(request, new NextResponse(null, { status: 204 }));
}
