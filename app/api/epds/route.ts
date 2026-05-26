import { NextResponse } from "next/server";
import { getPdfFolderInfo, listEpdRecords } from "@/lib/data";

export function GET() {
  const records = listEpdRecords();

  return NextResponse.json({
    count: records.length,
    pdfFolder: getPdfFolderInfo(),
    epds: records.map((r) => ({
      stem: r.stem,
      pdfFilename: r.pdfFilename,
      hasPdf: r.hasPdf,
      isDemoFixture: r.isDemoFixture,
      needsExtraction: r.needsExtraction,
      epd_number: r.phase2?.epd_number ?? r.phase1?.epd_number ?? null,
      product_name: r.phase2?.product_name ?? null,
      language: r.phase1?.language ?? null,
      phases: {
        phase1: !!r.phase1,
        phase2: !!r.phase2,
        draft: !!r.draftPath,
        graph: !!r.graphPath,
        verification: !!r.verificationPath,
      },
    })),
  });
}
