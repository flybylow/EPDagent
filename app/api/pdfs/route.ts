import { NextResponse } from "next/server";
import { getPdfFolderInfo, listEpdRecords } from "@/lib/data";

export function GET() {
  const folder = getPdfFolderInfo();
  const records = listEpdRecords();

  return NextResponse.json({
    folder: {
      path: folder.path,
      configured: folder.configured,
      count: folder.count,
    },
    pdfs: folder.files.map((filename) => {
      const stem = filename.replace(/\.pdf$/i, "");
      const record = records.find((r) => r.stem === stem);
      return {
        filename,
        stem,
        hasPdf: true,
        extracted: !!(record?.phase1 && record?.phase2),
        needsExtraction: record?.needsExtraction ?? true,
        isDemoFixture: record?.isDemoFixture ?? false,
      };
    }),
  });
}
