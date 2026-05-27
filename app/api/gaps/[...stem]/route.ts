import { NextResponse } from "next/server";
import { pdfPathForStem, resolveCorpusStem } from "@/lib/data";
import { buildGapReport, writeGapSnapshot } from "@/lib/extract/gap-report";
import { saveGapLock, type GapLockStatus } from "@/lib/extract/gap-lock";
import { normalizeEpdStem } from "@/lib/stems/normalize";

async function resolveStem(params: Promise<{ stem: string[] }>): Promise<string> {
  const { stem: parts } = await params;
  const stem = resolveCorpusStem(normalizeEpdStem(parts.join("/")));
  if (!pdfPathForStem(stem)) {
    throw new Error(`PDF not found for ${stem}`);
  }
  return stem;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ stem: string[] }> }
) {
  try {
    const stem = await resolveStem(params);
    const report = buildGapReport(stem);
    writeGapSnapshot(report);
    return NextResponse.json(report);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 404 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ stem: string[] }> }
) {
  try {
    const stem = await resolveStem(params);
    const body = (await request.json()) as {
      sectionId?: string;
      status?: GapLockStatus;
      note?: string;
    };
    if (!body.sectionId || !body.status) {
      return NextResponse.json({ error: "sectionId and status required" }, { status: 400 });
    }
    if (body.status !== "open" && body.status !== "accepted" && body.status !== "fixed") {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    saveGapLock(stem, body.sectionId, body.status, body.note?.trim() || undefined);
    const report = buildGapReport(stem);
    writeGapSnapshot(report);
    return NextResponse.json(report);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
