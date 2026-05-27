"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EpdGapPanel } from "@/app/components/EpdGapPanel";
import { EpdSectionContent } from "@/app/components/EpdSectionContent";
import { EpdSectionNav } from "@/app/components/EpdSectionNav";
import { EpdViewModeToggle } from "@/app/components/EpdViewModeToggle";
import { SectionMatchStrip } from "@/app/components/SectionMatchStrip";
import { EpdPdfPane } from "@/app/components/EpdPdfPane";
import { EpdExtractToolbar } from "@/app/components/EpdExtractToolbar";
import { SectionAvailabilityStrip } from "@/app/components/SectionAvailabilityStrip";
import type { ExtractRunSummary, PipelinePhaseSummary } from "@/lib/types";
import type { GapReport } from "@/lib/extract/gap-report";
import {
  findSectionById,
  parseSectionHash,
  sectionHash,
  type EpdViewMode,
  type SectionNavItem,
} from "@/lib/navigation/sections";
import type { EpdPhaseRegistry } from "@/lib/phases/registry";
import {
  resolveSectionAvailability,
  type EpdContentContext,
} from "@/lib/templates/section-view-resolve";

export function EpdDetailWorkspace({
  registry,
  pdfAvailable,
  pdfServeStem,
  extractSummary,
  pipelinePhases = [],
  hasDocmapIndex = true,
  gapReport = null,
  initialGapsOnly = false,
  extractEnabled = true,
}: {
  registry: EpdPhaseRegistry;
  pdfAvailable: boolean;
  pdfServeStem: string | null;
  extractSummary?: ExtractRunSummary | null;
  pipelinePhases?: PipelinePhaseSummary[];
  hasDocmapIndex?: boolean;
  gapReport?: GapReport | null;
  initialGapsOnly?: boolean;
  /** False on Vercel serve-only — hides in-browser extract (use local CLI). */
  extractEnabled?: boolean;
}) {
  const nav = registry.sectionNav;
  const tocItems = nav.items.filter((item) => item.id !== "__header__");
  const showExtract =
    extractEnabled &&
    extractSummary &&
    pdfAvailable &&
    (!extractSummary.upToDate || !hasDocmapIndex);

  const contentContext = useMemo<EpdContentContext>(
    () => ({
      stem: registry.stem,
      draft: registry.draft,
      phase1: registry.phase1,
      phase2: registry.phase2,
      phase3: registry.phase3,
      phase3Composition: registry.phase3Composition,
      phase3LcaStudy: registry.phase3LcaStudy,
      phase4Probe: registry.phase4Probe,
      phase4Probes: registry.phase4Probes,
      phase5: registry.phase5,
      phase6: registry.phase6,
      phase7: registry.phase7,
      phases: registry.phases,
      exportedTableIds: registry.phases.flatMap((p) => p.tables.map((t) => t.id)),
    }),
    [registry]
  );

  const [viewMode, setViewMode] = useState<EpdViewMode>("compare");
  const [sectionInfoOpen, setSectionInfoOpen] = useState(false);
  const [gapsOnly, setGapsOnly] = useState(initialGapsOnly);
  const [gapReportState, setGapReportState] = useState<GapReport | null>(gapReport);

  useEffect(() => {
    setGapReportState(gapReport);
  }, [gapReport]);
  const [activeId, setActiveId] = useState<string>(
    nav.defaultSectionId ?? nav.items[0]?.id ?? "__header__"
  );

  const showSectionInfo = sectionInfoOpen && viewMode === "compare";

  const syncFromHash = useCallback(() => {
    const fromHash = parseSectionHash(window.location.hash);
    if (fromHash && findSectionById(nav.items, fromHash)) {
      setActiveId(fromHash);
    }
  }, [nav.items]);

  useEffect(() => {
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, [syncFromHash]);

  useEffect(() => {
    if (viewMode !== "compare") setSectionInfoOpen(false);
  }, [viewMode]);

  const activeSection =
    findSectionById(nav.items, activeId) ?? nav.items[0] ?? null;

  const contentScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    contentScrollRef.current?.scrollTo(0, 0);
  }, [activeId]);

  const availability = useMemo(() => {
    if (!activeSection) return null;
    return resolveSectionAvailability(
      activeSection,
      contentContext,
      pdfAvailable,
      registry.sectionViewTemplate
    );
  }, [activeSection, contentContext, pdfAvailable]);

  const pdfPage = activeSection?.page ?? (pdfAvailable ? 1 : null);
  const pdfOpenUrl =
    pdfAvailable && pdfServeStem && pdfPage != null
      ? `/pdf/${encodeURIComponent(pdfServeStem)}#page=${pdfPage}&view=Fit`
      : null;

  function handleSelect(item: SectionNavItem) {
    setActiveId(item.id);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", sectionHash(item.id));
    }
  }

  function handleGapJump(sectionId: string) {
    const item = findSectionById(nav.items, sectionId);
    if (item) {
      setGapsOnly(true);
      handleSelect(item);
    }
  }

  function renderToolbar() {
    return (
      <div className="epd-detail-toolbar">
        <div className="epd-toolbar-modes">
          <EpdViewModeToggle mode={viewMode} onChange={setViewMode} />
          {activeSection && availability && viewMode === "compare" ? (
            <button
              type="button"
              className={`epd-section-info-btn${sectionInfoOpen ? " is-active" : ""}`}
              aria-expanded={sectionInfoOpen}
              aria-controls="epd-section-match-panel"
              title={
                sectionInfoOpen
                  ? "Hide PDF and data match info"
                  : "Show how this section links the PDF and extracted data"
              }
              onClick={() => setSectionInfoOpen((open) => !open)}
            >
              <span className="epd-section-info-icon" aria-hidden="true">
                i
              </span>
            </button>
          ) : null}
        </div>
        {pdfOpenUrl ? (
          <a
            href={pdfOpenUrl}
            target="_blank"
            rel="noreferrer"
            className="epd-open-pdf-link"
          >
            Open PDF{pdfPage != null ? ` p${pdfPage}` : ""}
          </a>
        ) : null}
      </div>
    );
  }

  if (!activeSection || !availability) {
    if (pdfAvailable && pdfServeStem) {
      return (
        <div
          className={`epd-detail-workspace mode-${viewMode}${
            showSectionInfo ? " has-section-info" : ""
          }`}
        >
          {renderToolbar()}
          {showExtract ? (
            <div className="epd-detail-extract-bar">
              <EpdExtractToolbar
                stem={registry.stem}
                hasPdf={pdfAvailable}
                extractSummary={extractSummary}
                pipelinePhases={pipelinePhases}
                layout="toolbar"
              />
            </div>
          ) : null}
          {tocItems.length === 0 ? (
            <div className="panel epd-pdf-only-hint">
              <p className="hint">
                No PDF index yet. Run missing steps — watch the <strong>DM</strong> light for docmap
                — then refresh.
              </p>
            </div>
          ) : null}
          {viewMode !== "content" ? (
            <section className="panel epd-pdf-pane epd-pdf-pane-full" aria-label="Original PDF">
              <div className="epd-pdf-pane-body">
                <EpdPdfPane
                  pdfServeStem={pdfServeStem}
                  pdfAvailable={pdfAvailable}
                  pdfPage={pdfPage}
                />
              </div>
            </section>
          ) : (
            <section className="panel epd-content-pane">
              <p className="hint section-empty-state">
                Run extraction to populate structured content.
              </p>
            </section>
          )}
        </div>
      );
    }

    return (
      <p className="hint">
        No document index for this EPD. Run missing steps from the dashboard or toolbar above.
      </p>
    );
  }

  return (
    <div
      className={`epd-detail-workspace mode-${viewMode}${
        showSectionInfo ? " has-section-info" : ""
      }`}
    >
      {renderToolbar()}

      {showExtract ? (
        <div className="epd-detail-extract-bar">
          <EpdExtractToolbar
            stem={registry.stem}
            hasPdf={pdfAvailable}
            extractSummary={extractSummary}
            pipelinePhases={pipelinePhases}
            layout="toolbar"
          />
        </div>
      ) : null}

      <EpdGapPanel
        stem={registry.stem}
        initialReport={gapReportState}
        onJumpToSection={handleGapJump}
        onGapsOnlyChange={setGapsOnly}
        onReportUpdate={setGapReportState}
      />

      <EpdSectionNav
        key={registry.stem}
        items={nav.items}
        activeId={activeId}
        onSelect={handleSelect}
        initialGapsOnly={initialGapsOnly}
        gapsOnly={gapsOnly}
        onGapsOnlyChange={setGapsOnly}
      />

      {showSectionInfo ? (
        <div id="epd-section-match-panel" className="epd-section-match">
          <SectionMatchStrip section={activeSection} availability={availability} />
        </div>
      ) : null}

      <section className="panel epd-pdf-pane" aria-label="Original PDF">
        <div className="epd-pdf-pane-body">
          {viewMode !== "compare" ? (
            <SectionAvailabilityStrip availability={availability} side="pdf" />
          ) : null}
          <EpdPdfPane
            pdfServeStem={pdfServeStem}
            pdfAvailable={pdfAvailable}
            pdfPage={pdfPage}
          />
        </div>
      </section>

      <section className="panel epd-content-pane" aria-label="Extracted content">
        <div className="epd-content-pane-body" ref={contentScrollRef}>
          {viewMode === "content" ? (
            <SectionAvailabilityStrip availability={availability} side="content" />
          ) : null}
          <EpdSectionContent
            section={activeSection}
            registry={registry}
            availability={availability}
          />
        </div>
      </section>
    </div>
  );
}
