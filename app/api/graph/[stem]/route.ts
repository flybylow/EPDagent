import { NextResponse } from "next/server";
import { buildGraphDocumentForStem } from "@/lib/graph/document";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ stem: string }> }
) {
  const { stem: rawStem } = await params;
  const stem = decodeURIComponent(rawStem);
  const doc = buildGraphDocumentForStem(stem);

  if (!doc) {
    return NextResponse.json({ error: "No extraction data for graph" }, { status: 404 });
  }

  return NextResponse.json(doc, {
    headers: {
      "Content-Type": "application/ld+json",
    },
  });
}
