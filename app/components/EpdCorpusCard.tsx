"use client";

import Link from "next/link";
import { EpdCoverageStats } from "@/app/components/EpdCoverageStats";
import { EpdExtractToolbar } from "@/app/components/EpdExtractToolbar";
import { EpdPhaseLights } from "@/app/components/EpdPhaseLights";
import type { EpdRecord } from "@/lib/types";

function SourceTag({ record }: { record: EpdRecord }) {
  if (record.referenceId) {
    return (
      <span className="source-tag source-reference" title={record.referenceLabel ?? undefined}>
        reference
      </span>
    );
  }
  if (
    record.hasPdf &&
    !record.isDemoFixture &&
    record.sectionCoverage &&
    record.sectionCoverage.withData > 0
  ) {
    return (
      <span className="source-tag source-extracted" title="PDF on disk and structured section data">
        pdf + data
      </span>
    );
  }
  if (record.hasPdf && !record.isDemoFixture && record.phase1) {
    return <span className="source-tag source-extracted">extracted</span>;
  }
  if (record.hasPdf && record.needsExtraction) {
    return <span className="source-tag source-pdf">PDF only</span>;
  }
  if (record.isDemoFixture) {
    return <span className="source-tag source-demo">demo data</span>;
  }
  if (record.hasPdf) {
    return <span className="source-tag source-pdf">PDF</span>;
  }
  return <span className="source-tag source-orphan">no PDF</span>;
}

export function EpdCorpusCard({
  record,
  extractEnabled = true,
}: {
  record: EpdRecord;
  extractEnabled?: boolean;
}) {
  return (
    <li className="epd-card">
      <div className="epd-card-main">
        <div className="epd-card-title-row">
          <Link href={`/epd/${encodeURIComponent(record.stem)}`} className="epd-title">
            {record.phase2?.product_name ?? record.phase1?.epd_number ?? record.stem}
          </Link>
          <EpdCoverageStats
            coverage={record.sectionCoverage}
            pipelinePhases={record.pipelinePhases}
            stem={record.stem}
            compact
          />
        </div>
        <p className="epd-meta">
          <Link
            href={`/epd/${encodeURIComponent(record.stem)}`}
            className="epd-meta-link"
          >
            {record.phase2?.epd_number ?? record.phase1?.epd_number ?? record.stem}
          </Link>
          {record.phase1?.language ? ` · ${record.phase1.language}` : ""}
        </p>
        <SourceTag record={record} />
      </div>

      <div className="epd-actions">
        {record.pipelinePhases.length > 0 && !extractEnabled ? (
          <div className="epd-extract-stack epd-phase-lights-readonly" aria-label="Pipeline phase status">
            <EpdPhaseLights phases={record.pipelinePhases} />
          </div>
        ) : null}
        {record.hasPdf && extractEnabled ? (
          <EpdExtractToolbar
            stem={record.stem}
            hasPdf={record.hasPdf}
            extractSummary={record.extractSummary}
            pipelinePhases={record.pipelinePhases}
            layout="stacked"
          />
        ) : null}
        {record.draftPath ? (
          <Link
            href={`/epd/${encodeURIComponent(record.stem)}/verify`}
            className="epd-verify-link"
          >
            Verify
          </Link>
        ) : null}
      </div>
    </li>
  );
}
