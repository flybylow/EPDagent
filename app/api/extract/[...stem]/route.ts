import { NextResponse } from "next/server";
import { pdfPathForStem, resolveCorpusStem } from "@/lib/data";
import { summarizeExtractRun } from "@/lib/extract/extract-plan-status";
import { createFullExtractProgressStream } from "@/lib/extract/progress-stream";
import { runFullExtractForStem } from "@/lib/extract/full-extract";
import { logExtractProgress } from "@/lib/extract/progress";
import { extractPdf } from "@/lib/extract/run";
import { normalizeEpdStem } from "@/lib/stems/normalize";

/** Phase 7 can send a multi-page slice + long tool output; allow headroom on local / Pro. */
export const maxDuration = 600;

async function resolveExtractStem(params: Promise<{ stem: string[] }>): Promise<string> {
  const { stem: parts } = await params;
  const stem = resolveCorpusStem(normalizeEpdStem(parts.join("/")));
  if (!pdfPathForStem(stem)) {
    throw new Error(`PDF not found for ${stem}. Add the PDF to data/EPD/.`);
  }
  return stem;
}

/** Pending pipeline steps for chunked client extract. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ stem: string[] }> }
) {
  try {
    const stem = await resolveExtractStem(params);
    const summary = summarizeExtractRun(stem);
    return NextResponse.json({
      stem,
      pendingCount: summary.pendingCount,
      upToDate: summary.upToDate,
      totalSteps: summary.totalSteps,
      pendingStepLabels: summary.runnableSteps.map((s) => s.label),
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 404 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ stem: string[] }> }
) {
  let stem: string;
  try {
    stem = await resolveExtractStem(params);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 404 });
  }

  let phase2 = true;
  let full = true;
  let force = false;
  let stream = false;
  let pendingOnly = false;
  let maxSteps: number | undefined;
  try {
    const body = await request.json().catch(() => ({}));
    if (body && typeof body.phase2 === "boolean") phase2 = body.phase2;
    if (body && typeof body.full === "boolean") full = body.full;
    if (body && typeof body.force === "boolean") force = body.force;
    if (body && typeof body.stream === "boolean") stream = body.stream;
    if (body && typeof body.pendingOnly === "boolean") pendingOnly = body.pendingOnly;
    if (body && typeof body.maxSteps === "number" && body.maxSteps > 0) {
      maxSteps = Math.floor(body.maxSteps);
    }
  } catch {
    // defaults: full pipeline, refresh when force=true
  }

  if (force) pendingOnly = false;

  try {
    if (full) {
      if (stream) {
        const body = createFullExtractProgressStream(stem, { force, pendingOnly, maxSteps });
        return new Response(body, {
          headers: {
            "Content-Type": "application/x-ndjson; charset=utf-8",
            "Cache-Control": "no-store",
          },
        });
      }

      const result = await runFullExtractForStem(stem, {
        force,
        pendingOnly,
        maxSteps,
        onProgress: logExtractProgress,
      });
      const failed = result.steps.filter((s) => !s.ok);
      if (failed.length) {
        return NextResponse.json(
          {
            ...result,
            warning: `${failed.length} step(s) failed`,
          },
          { status: 207 }
        );
      }
      return NextResponse.json(result);
    }

    const result = await extractPdf(stem, { phase2, force });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
