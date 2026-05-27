import { pdfExistsForStem, pdfResponseForStem } from "@/lib/pdf/serve";
import { NextResponse } from "next/server";

async function resolveStem(params: Promise<{ stem: string[] }>): Promise<string> {
  const { stem: parts } = await params;
  return decodeURIComponent(parts.join("/"));
}

export async function HEAD(
  _request: Request,
  { params }: { params: Promise<{ stem: string[] }> }
) {
  const stem = await resolveStem(params);
  if (!pdfExistsForStem(stem)) {
    return new NextResponse(null, { status: 404 });
  }
  return new NextResponse(null, { status: 200 });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ stem: string[] }> }
) {
  const stem = await resolveStem(params);
  return pdfResponseForStem(stem);
}
