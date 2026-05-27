import { NextResponse } from "next/server";
import { pdfPathForStem, resolveCorpusStem } from "@/lib/data";
import { buildGapReport } from "@/lib/extract/gap-report";
import { runExtractStepForStem } from "@/lib/extract/run-extract-step";
import { normalizeEpdStem } from "@/lib/stems/normalize";

/** See docs/vercel-deploy.md — 300 for Vercel Hobby; extract via CLI for production publish. */
export const maxDuration = 300;

async function resolveStem(params: Promise<{ stem: string[] }>): Promise<string> {
  const { stem: parts } = await params;
  const stem = resolveCorpusStem(normalizeEpdStem(parts.join("/")));
  if (!pdfPathForStem(stem)) {
    throw new Error(`PDF not found for ${stem}. Add the PDF to data/EPD/.`);
  }
  return stem;
}

/** Run a single pipeline step (e.g. phase3-composition) for one EPD. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ stem: string[] }> }
) {
  let stem: string;
  try {
    stem = await resolveStem(params);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 404 });
  }

  let stepId = "";
  let force = false;
  try {
    const body = (await request.json()) as { stepId?: string; force?: boolean };
    stepId = typeof body.stepId === "string" ? body.stepId.trim() : "";
    if (body.force === true) force = true;
  } catch {
    return NextResponse.json({ error: "JSON body with stepId required" }, { status: 400 });
  }

  if (!stepId) {
    return NextResponse.json({ error: "stepId required" }, { status: 400 });
  }

  try {
    const result = await runExtractStepForStem(stem, stepId, { force });
    const gapReport = buildGapReport(stem);
    return NextResponse.json({ ...result, gapReport });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message, stepId }, { status: 400 });
  }
}
