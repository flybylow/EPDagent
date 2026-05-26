import * as fs from "node:fs";
import { NextResponse } from "next/server";
import { pdfPathForStem } from "@/lib/data";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ stem: string }> }
) {
  const { stem: rawStem } = await params;
  const stem = decodeURIComponent(rawStem);
  const pdfPath = pdfPathForStem(stem);

  if (!pdfPath) {
    return NextResponse.json(
      { error: `PDF not found — add pdfs/${stem}.pdf` },
      { status: 404 }
    );
  }

  const bytes = fs.readFileSync(pdfPath);
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${stem}.pdf"`,
    },
  });
}
