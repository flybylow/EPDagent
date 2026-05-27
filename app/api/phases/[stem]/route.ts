import { NextResponse } from "next/server";
import {
  loadPhase1,
  loadPhase2,
  loadPhase3,
  loadPhase3Composition,
  loadPhase3LcaStudy,
  loadPhase5,
  loadPhase6,
  loadPhase7,
} from "@/lib/data";

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

  if (phase === "3") {
    const data = loadPhase3(stem);
    if (!data) return NextResponse.json({ error: "Phase 3 not found" }, { status: 404 });
    return NextResponse.json(data);
  }

  if (phase === "3-composition") {
    const data = loadPhase3Composition(stem);
    if (!data) {
      return NextResponse.json({ error: "Phase 3 composition not found" }, { status: 404 });
    }
    return NextResponse.json(data);
  }

  if (phase === "3-lca-study") {
    const data = loadPhase3LcaStudy(stem);
    if (!data) {
      return NextResponse.json({ error: "Phase 3 LCA study not found" }, { status: 404 });
    }
    return NextResponse.json(data);
  }

  if (phase === "5") {
    const data = loadPhase5(stem);
    if (!data) return NextResponse.json({ error: "Phase 5 not found" }, { status: 404 });
    return NextResponse.json(data);
  }

  if (phase === "6") {
    const data = loadPhase6(stem);
    if (!data) return NextResponse.json({ error: "Phase 6 not found" }, { status: 404 });
    return NextResponse.json(data);
  }

  if (phase === "7") {
    const data = loadPhase7(stem);
    if (!data) return NextResponse.json({ error: "Phase 7 not found" }, { status: 404 });
    return NextResponse.json(data);
  }

  return NextResponse.json(
    { error: "Use ?phase=1, 2, 3, 3-composition, 3-lca-study, 5, 6, or 7" },
    { status: 400 }
  );
}
