import { NextResponse } from "next/server";
import { loadDraft, loadDraftManifest } from "@/lib/data";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ stem: string }> }
) {
  const { stem: rawStem } = await params;
  const stem = decodeURIComponent(rawStem);
  const draft = loadDraft(stem);
  const manifest = loadDraftManifest(stem);

  if (!draft) {
    return NextResponse.json({ error: "Draft not found — run npm run drafts" }, { status: 404 });
  }

  return NextResponse.json({ manifest, draft });
}
