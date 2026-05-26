import { NextResponse } from "next/server";
import { loadTableManifest } from "@/lib/tables/manifest";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ stem: string }> }
) {
  const { stem: rawStem } = await params;
  const stem = decodeURIComponent(rawStem);
  const manifest = loadTableManifest(stem);
  if (!manifest) {
    return NextResponse.json({ error: "No table exports" }, { status: 404 });
  }
  return NextResponse.json(manifest);
}
