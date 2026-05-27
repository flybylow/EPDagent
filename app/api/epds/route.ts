import { NextResponse } from "next/server";
import { getPdfFolderInfo, listEpdRecords, loadPhase2, loadPhase3 } from "@/lib/data";
import { inferProductTags, recordMatchesTag } from "@/lib/facts/tags";
import { withCors } from "@/lib/http/cors";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tag = url.searchParams.get("tag")?.trim().toLowerCase() ?? null;

  let records = listEpdRecords();

  const epds = records
    .map((r) => {
      const phase2 = loadPhase2(r.stem);
      const phase3 = loadPhase3(r.stem);
      const tags = inferProductTags(phase2, phase3);
      return {
        stem: r.stem,
        pdfFilename: r.pdfFilename,
        hasPdf: r.hasPdf,
        isDemoFixture: r.isDemoFixture,
        needsExtraction: r.needsExtraction,
        epd_number: phase2?.epd_number ?? r.phase2?.epd_number ?? r.phase1?.epd_number ?? null,
        product_name: phase2?.product_name ?? r.phase2?.product_name ?? null,
        language: r.phase1?.language ?? null,
        tags,
        facts_url: `/api/facts/${encodeURIComponent(r.stem)}`,
        phases: {
          phase1: !!r.phase1,
          phase2: !!r.phase2,
          draft: !!r.draftPath,
          graph: !!r.graphPath,
          verification: !!r.verificationPath,
        },
      };
    })
    .filter((e) => !tag || recordMatchesTag(e.tags, tag));

  return withCors(
    request,
    NextResponse.json({
      count: epds.length,
      pdfFolder: getPdfFolderInfo(),
      epds,
    })
  );
}

export async function OPTIONS(request: Request) {
  return withCors(request, new NextResponse(null, { status: 204 }));
}
