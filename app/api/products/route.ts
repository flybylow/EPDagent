import { NextResponse } from "next/server";
import { loadPhase2, loadPhase3, listEpdRecords } from "@/lib/data";
import { inferProductTags, recordMatchesTag } from "@/lib/facts/tags";
import { withCors } from "@/lib/http/cors";

/**
 * Lightweight catalog for cross-domain discovery (Tabulas / Pentapylas).
 * Filter: ?tag=insulation  |  ?q=rockwool (substring on name / description)
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const tag = url.searchParams.get("tag")?.trim().toLowerCase() ?? null;
  const q = url.searchParams.get("q")?.trim().toLowerCase() ?? null;

  let records = listEpdRecords();

  const products = records
    .map((r) => {
      const phase2 = loadPhase2(r.stem);
      const phase3 = loadPhase3(r.stem);
      const tags = inferProductTags(phase2, phase3);
      const name =
        phase2?.product_name ??
        r.phase2?.product_name ??
        r.stem;
      const text = [
        name,
        phase2?.product_description,
        phase3?.description,
        phase3?.intended_use,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return {
        stem: r.stem,
        product_name: name,
        epd_number: phase2?.epd_number ?? r.phase2?.epd_number ?? null,
        producer: phase2?.producer?.name ?? null,
        tags,
        has_facts: Boolean(phase2 || phase3),
        has_thermal: tags.includes("thermal-data"),
        has_lca: Boolean(r.graphPath),
        facts_url: `/api/facts/${encodeURIComponent(r.stem)}`,
      };
    })
    .filter((p) => {
      if (tag && !recordMatchesTag(p.tags, tag)) return false;
      if (q && !p.product_name?.toLowerCase().includes(q) && !p.stem.toLowerCase().includes(q)) {
        const phase3 = loadPhase3(p.stem);
        const blob = [phase3?.description, phase3?.intended_use].filter(Boolean).join(" ").toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });

  return withCors(
    request,
    NextResponse.json({
      schema: "epdagent.product-catalog.v1",
      count: products.length,
      products,
    })
  );
}

export async function OPTIONS(request: Request) {
  return withCors(request, new NextResponse(null, { status: 204 }));
}
