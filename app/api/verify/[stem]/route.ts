import { NextResponse } from "next/server";
import { loadDraft, loadVerification } from "@/lib/data";
import { verifyDraftAgainstPdf } from "@/lib/verify/run";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ stem: string }> }
) {
  const { stem: rawStem } = await params;
  const stem = decodeURIComponent(rawStem);
  const result = loadVerification(stem);

  if (!result) {
    return NextResponse.json({ error: "No verification yet" }, { status: 404 });
  }

  return NextResponse.json(result);
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ stem: string }> }
) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY required for AI verification" },
      { status: 503 }
    );
  }

  const { stem: rawStem } = await params;
  const stem = decodeURIComponent(rawStem);
  const draft = loadDraft(stem);

  if (!draft) {
    return NextResponse.json({ error: "Draft not found — run npm run drafts" }, { status: 404 });
  }

  try {
    const result = await verifyDraftAgainstPdf(stem, draft, apiKey);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
