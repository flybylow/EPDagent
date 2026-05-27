import type { SectionAvailability } from "@/lib/templates/section-view-types";
import type { SectionNavItem } from "@/lib/navigation/sections";

function matchHint(section: SectionNavItem, availability: SectionAvailability): string {
  if (availability.hasExtractedContent && availability.hasPdfLink) {
    const view = availability.view?.view;
    if (view === "phase4_lca") {
      return "Compare the PDF table (rotated module headers) with the extracted grid on the right.";
    }
    if (view === "phase3_composition" || view === "phase3_technical") {
      return "Match table rows and values between the PDF page and the structured table.";
    }
    if (view === "phase5_scenarios") {
      return "Each scenario block on the PDF should correspond to a card in the extracted list.";
    }
    if (view === "phase6_refs") {
      return "Bibliography entries on the PDF should match the reference list on the right.";
    }
    if (availability.fields.length) {
      const filled = availability.fields.filter((f) => !f.empty).length;
      return `${filled} field${filled === 1 ? "" : "s"} extracted — verify against the PDF section on the left.`;
    }
    if (view === "draft") {
      return "Header fields below should match the cover and declaration pages in the PDF.";
    }
    return "Structured content is available — scroll the PDF to this section and compare.";
  }

  if (availability.hasVisualExport && availability.hasPdfLink) {
    return "PNG table export is available; run the matching phase extractor for structured data.";
  }

  if (availability.hasPdfLink) {
    return availability.pendingMessage ?? "PDF is linked but no extractor is mapped for this section yet.";
  }

  return availability.pendingMessage ?? "No PDF page or extracted content for this section.";
}

export function SectionMatchStrip({
  section,
  availability,
}: {
  section: SectionNavItem;
  availability: SectionAvailability;
}) {
  const pdfLabel = availability.hasPdfLink
    ? availability.pdfPage != null
      ? `Page ${availability.pdfPage}`
      : "Linked"
    : availability.pdfAvailable
      ? "No page"
      : "Not on disk";

  let dataLabel = "None";
  let dataTone: "ok" | "export" | "missing" = "missing";
  if (availability.hasExtractedContent) {
    dataTone = "ok";
    const view = availability.view?.view;
    if (view === "phase4_lca") dataLabel = "LCA table";
    else if (view === "phase3_composition") dataLabel = "Composition";
    else if (view === "phase3_technical") dataLabel = "Technical data";
    else if (view === "phase5_scenarios") dataLabel = "Scenarios";
    else if (view === "phase5_scenario") dataLabel = "Scenario";
    else if (view === "phase7_section") dataLabel = "Section text";
    else if (view === "phase6_refs") dataLabel = "References";
    else if (availability.fields.length) {
      const filled = availability.fields.filter((f) => !f.empty).length;
      dataLabel = `${filled} field${filled === 1 ? "" : "s"}`;
    } else dataLabel = "Structured";
  } else if (availability.hasVisualExport) {
    dataTone = "export";
    dataLabel = "PNG only";
  } else if (availability.pendingMessage?.includes("npm run")) {
    dataLabel = "Pending";
  }

  const hint = matchHint(section, availability);
  const hasBoth =
    availability.hasPdfLink && availability.hasExtractedContent;
  const isGap =
    availability.hasPdfLink &&
    !availability.hasExtractedContent &&
    !availability.hasVisualExport;

  const sectionLabel =
    section.number !== "—" ? `${section.number} · ${section.title}` : section.title;

  return (
    <div className={`section-match-strip${isGap ? " is-gap" : ""}`}>
      <div className="section-match-head">
        <span className="section-match-section">{sectionLabel}</span>
        {hasBoth ? (
          <p className="section-match-lead">
            Verification through the PDF and the extracted data for this section.
          </p>
        ) : null}
      </div>
      <div className="section-match-cols">
        <div className="section-match-col">
          <span className="section-match-label">PDF</span>
          <span
            className={`section-match-value${
              availability.hasPdfLink ? " is-ok" : " is-missing"
            }`}
          >
            {pdfLabel}
          </span>
        </div>
        <div className="section-match-col">
          <span className="section-match-label">Extracted</span>
          <span className={`section-match-value is-${dataTone}`}>{dataLabel}</span>
        </div>
        <div className="section-match-col section-match-hint">
          <span className="section-match-label">Match</span>
          <span className="section-match-hint-text">{hint}</span>
        </div>
      </div>
    </div>
  );
}
