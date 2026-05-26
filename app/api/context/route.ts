import { NextResponse } from "next/server";
import { JSONLD_CONTEXT } from "@/lib/jsonld/context";

export function GET() {
  return NextResponse.json(JSONLD_CONTEXT, {
    headers: {
      "Content-Type": "application/ld+json",
    },
  });
}
