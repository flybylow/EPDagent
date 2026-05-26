import { NextResponse } from "next/server";
import { extractPdf } from "@/lib/extract/run";

export const maxDuration = 120;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ stem: string }> }
) {
  const { stem: rawStem } = await params;
  const stem = decodeURIComponent(rawStem);

  let phase2 = true;
  try {
    const body = await request.json().catch(() => ({}));
    if (body && typeof body.phase2 === "boolean") phase2 = body.phase2;
  } catch {
    // default phase2 true
  }

  try {
    const result = await extractPdf(stem, { phase2 });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
