import * as fs from "node:fs";
import * as path from "node:path";
import { NextResponse } from "next/server";
import { TABLE_EXPORTS_DIR } from "@/lib/tables/manifest";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ stem: string; file: string }> }
) {
  const { stem: rawStem, file } = await params;
  const stem = decodeURIComponent(rawStem);
  const safe = path.basename(file);
  if (!safe.endsWith(".png")) {
    return NextResponse.json({ error: "Invalid file" }, { status: 400 });
  }

  const imagePath = path.join(TABLE_EXPORTS_DIR, stem, safe);
  if (!fs.existsSync(imagePath)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = fs.readFileSync(imagePath);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
