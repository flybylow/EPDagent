import { NextResponse } from "next/server";
import { loadDocmapForStem } from "@/lib/phases/registry";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ stem: string }> }
) {
  const { stem: rawStem } = await params;
  const stem = decodeURIComponent(rawStem);
  const docmap = loadDocmapForStem(stem);

  if (!docmap) {
    return NextResponse.json(
      { error: "Docmap not found — run npm run docmap" },
      { status: 404 }
    );
  }

  return NextResponse.json(docmap);
}
