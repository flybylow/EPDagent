import { NextResponse } from "next/server";
import { loadGraphDocument } from "@/lib/data";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ stem: string }> }
) {
  const { stem: rawStem } = await params;
  const stem = decodeURIComponent(rawStem);
  const doc = loadGraphDocument(stem);

  if (!doc) {
    return NextResponse.json({ error: "Graph not found" }, { status: 404 });
  }

  return NextResponse.json(doc, {
    headers: {
      "Content-Type": "application/ld+json",
    },
  });
}
