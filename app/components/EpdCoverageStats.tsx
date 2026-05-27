import Link from "next/link";
import { pipelineCoverageSummary } from "@/lib/phases/pipeline-stats";
import type { PipelinePhaseSummary, SectionCoverageSummary } from "@/lib/types";

export function EpdCoverageStats({
  coverage,
  pipelinePhases,
  compact,
  stem,
}: {
  coverage: SectionCoverageSummary | null;
  pipelinePhases?: PipelinePhaseSummary[];
  compact?: boolean;
  /** When set, gap count links to the EPD page with the gap panel open. */
  stem?: string;
}) {
  const pipeline = pipelinePhases?.length
    ? pipelineCoverageSummary(pipelinePhases)
    : null;

  if (!coverage?.total && !pipeline?.total) return null;

  return (
    <p
      className={`epd-coverage-stats${compact ? " is-compact" : ""}`}
      aria-label="Coverage summary"
    >
      {pipeline ? (
        <span
          className="epd-nav-stat is-pipeline"
          title={`${pipeline.ready} of ${pipeline.total} extract phases have output (DM, P1, P3, P4, …). Green lights on the card match this.`}
        >
          {pipeline.ready}/{pipeline.total} phases
        </span>
      ) : null}
      {coverage && coverage.total > 0 ? (
        <span
          className="epd-nav-stat is-data"
          title={`${coverage.withData} of ${coverage.total} document sections (from the PDF index) have structured data mapped to that section.`}
        >
          {coverage.withData}/{coverage.total} sections
        </span>
      ) : null}
      {coverage && coverage.gaps > 0 ? (
        stem ? (
          <Link
            href={`/epd/${encodeURIComponent(stem)}?gaps=1`}
            className="epd-nav-stat is-gap"
            title="Open gap list and jump to each section"
          >
            {coverage.gaps} gaps
          </Link>
        ) : (
          <span
            className="epd-nav-stat is-gap"
            title="Sections on a PDF page with no structured data yet"
          >
            {coverage.gaps} gaps
          </span>
        )
      ) : null}
    </p>
  );
}
