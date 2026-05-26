import { NextResponse } from "next/server";
import { loadCorpus } from "@/lib/data";

export function GET() {
  const doc = loadCorpus();

  if (!doc) {
    return NextResponse.json(
      { error: "corpus.jsonld not found — run npm run graph" },
      { status: 404 }
    );
  }

  return NextResponse.json(doc, {
    headers: {
      "Content-Type": "application/ld+json",
    },
  });
}
