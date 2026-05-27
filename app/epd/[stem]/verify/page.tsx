import Link from "next/link";
import { notFound } from "next/navigation";
import { EpdCompareWorkspace } from "@/app/components/EpdCompareWorkspace";
import { EpdWorkspaceLayout } from "@/app/components/EpdWorkspaceLayout";
import { corpusPickerItemsFromRecords } from "@/lib/corpus/picker-item";
import {
  canonicalExtractStem,
  listEpdRecords,
  loadEpdRecord,
  loadVerification,
  pdfPathForStem,
  resolveCorpusStem,
} from "@/lib/data";
import { isServeOnlyDeploy } from "@/lib/deploy/serve-only";
import { docmapIsCached } from "@/lib/extract/docmap-cache";
import { ensureDocmapForStem } from "@/lib/extract/ensure-docmap";
import { ensurePhase7ForStem } from "@/lib/extract/ensure-phase7";
import { resolveEpdPhases } from "@/lib/phases/registry";
import { normalizeEpdStem } from "@/lib/stems/normalize";

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ stem: string }>;
}) {
  const { stem: rawStem } = await params;
  const stem = resolveCorpusStem(normalizeEpdStem(rawStem));
  if (pdfPathForStem(stem) && !isServeOnlyDeploy()) {
    const canonical = canonicalExtractStem(stem);
    if (!docmapIsCached(canonical)) {
      await ensureDocmapForStem(stem);
    }
    await ensurePhase7ForStem(stem);
  }
  const record = loadEpdRecord(stem);
  const registry = resolveEpdPhases(stem, { pdfAvailable: record.hasPdf });

  if (!registry.draft) {
    notFound();
  }

  const verification = loadVerification(stem);
  const corpusItems = corpusPickerItemsFromRecords(listEpdRecords());

  return (
    <div className="epd-detail-page">
      <EpdWorkspaceLayout corpusItems={corpusItems} activeStem={stem}>
        <header className="epd-detail-page-header">
          <Link href={`/epd/${encodeURIComponent(stem)}`} className="epd-detail-back">
            ← Compare view
          </Link>
          <h1>{registry.draft.title}</h1>
        </header>

        <EpdCompareWorkspace
        registry={registry}
        pdfAvailable={record.hasPdf}
        pdfServeStem={record.pdfServeStem}
        extractSummary={record.extractSummary}
        pipelinePhases={record.pipelinePhases}
        hasDocmapIndex={record.hasDocmapIndex}
        initialVerification={verification}
        showVerification
        />
      </EpdWorkspaceLayout>
    </div>
  );
}
