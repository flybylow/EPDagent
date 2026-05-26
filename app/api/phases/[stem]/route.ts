import { NextResponse } from "next/server";
import { loadPhase1, loadPhase2 } from "@/lib/data";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ stem: string }> }
) {
  const { stem: rawStem } = await params;
  const stem = decodeURIComponent(rawStem);
  const url = new URL(request.url);
  const phase = url.searchParams.get("phase");

  if (phase === "1") {
    const data = loadPhase1(stem);
    if (!data) return NextResponse.json({ error: "Phase 1 not found" }, { status: 404 });
    return NextResponse.json(data);
  }

  if (phase === "2") {
    const data = loadPhase2(stem);
    if (!data) return NextResponse.json({ error: "Phase 2 not found" }, { status: 404 });
    return NextResponse.json(data);
  }

  return NextResponse.json({ error: "Use ?phase=1 or ?phase=2" }, { status: 400 });
}
