import { notFound } from "next/navigation";
import { EpdCompareWorkspace } from "@/app/components/EpdCompareWorkspace";
import { GraphCoverageSummary } from "@/app/components/GraphCoverageSummary";
import { EpdWorkspaceLayout } from "@/app/components/EpdWorkspaceLayout";
import { corpusPickerItemsFromRecords } from "@/lib/corpus/picker-item";
import {
  listEpdDashboardRecords,
  loadEpdRecord,
  loadVerification,
  resolveCorpusStem,
} from "@/lib/data";
import { isServeOnlyDeploy } from "@/lib/deploy/serve-only";
import { ensurePdfArtifactsForStem } from "@/lib/extract/ensure-pdf-artifacts";
import { buildGapReport, writeGapSnapshot } from "@/lib/extract/gap-report";
import { buildGraphDocumentForStem } from "@/lib/graph/document";
import { resolveEpdPhases } from "@/lib/phases/registry";
import { normalizeEpdStem } from "@/lib/stems/normalize";

export const dynamic = "force-dynamic";

function JsonBlock({ data }: { data: unknown }) {
  return <pre className="code-block">{JSON.stringify(data, null, 2)}</pre>;
}

export default async function EpdPage({
  params,
  searchParams,
}: {
  params: Promise<{ stem: string }>;
  searchParams: Promise<{ gaps?: string }>;
}) {
  const { stem: rawStem } = await params;
  const { gaps: gapsQuery } = await searchParams;
  const stem = resolveCorpusStem(normalizeEpdStem(rawStem));
  if (!isServeOnlyDeploy()) {
    await ensurePdfArtifactsForStem(stem);
  }

  const record = loadEpdRecord(stem, {
    includeSectionCoverage: !isServeOnlyDeploy(),
  });
  const corpusItems = corpusPickerItemsFromRecords(listEpdDashboardRecords());

  if (!record.phase1 && !record.phase2 && !record.hasPdf) {
    notFound();
  }

  const registry = resolveEpdPhases(stem, { pdfAvailable: record.hasPdf });
  const gapReport = record.hasPdf ? buildGapReport(stem) : null;
  if (gapReport) writeGapSnapshot(gapReport);
  const graph = buildGraphDocumentForStem(stem);
  const verification = loadVerification(stem);
  const encoded = encodeURIComponent(stem);

  return (
    <div className="epd-detail-page">
      <EpdWorkspaceLayout corpusItems={corpusItems} activeStem={stem}>
        <EpdCompareWorkspace
          registry={registry}
          pdfAvailable={record.hasPdf}
          pdfServeStem={record.pdfServeStem}
          extractSummary={record.extractSummary}
          pipelinePhases={record.pipelinePhases}
          hasDocmapIndex={record.hasDocmapIndex}
          initialVerification={verification}
          showVerification={false}
          gapReport={gapReport}
          initialGapsOnly={gapsQuery === "1"}
          extractEnabled={!isServeOnlyDeploy()}
        />

        <details className="panel dev-data-panel">
        <summary className="panel-head dev-data-summary">
          <h2>JSON-LD graph</h2>
          <span className="hint">Live from extraction outputs</span>
        </summary>
        <div className="dev-data-body">
          <div className="panel-head">
            <span />
            <a href={`/api/graph/${encoded}`} target="_blank" rel="noreferrer">
              Raw JSON-LD
            </a>
          </div>
          {graph ? (
            <>
              <GraphCoverageSummary
                coverage={
                  (graph["@graph"] as Array<Record<string, unknown>>)?.[0]
                    ?.extractionCoverage as Record<string, boolean | string[]>
                }
                nodeCount={(graph["@graph"] as unknown[])?.length ?? 0}
              />
              <JsonBlock data={graph} />
            </>
          ) : (
            <p className="hint">
              No extraction data yet. Run extract on this EPD first.
            </p>
          )}
        </div>
        </details>
      </EpdWorkspaceLayout>
    </div>
  );
}
