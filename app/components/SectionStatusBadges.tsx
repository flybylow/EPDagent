import type { SectionNavAvailability } from "@/lib/navigation/sections";

export function SectionStatusBadges({
  availability,
  compact = false,
}: {
  availability: SectionNavAvailability;
  compact?: boolean;
}) {
  const pdfOn = availability.hasPdfLink;
  const dataOn = availability.hasExtractedContent;
  const exportOn = availability.hasVisualExport && !dataOn;

  return (
    <span className="epd-nav-badges" aria-label="Section availability">
      <span
        className={`epd-nav-badge epd-nav-badge-pdf${pdfOn ? " is-on" : " is-off"}`}
        title={pdfOn ? "PDF page linked" : "No PDF page mapped"}
      >
        {compact ? "P" : "pdf"}
      </span>
      <span
        className={`epd-nav-badge epd-nav-badge-data${
          dataOn ? " is-on" : exportOn ? " is-export" : " is-off"
        }`}
        title={
          dataOn
            ? "Structured data extracted"
            : exportOn
              ? "Table PNG export only"
              : "No extracted data"
        }
      >
        {compact ? "D" : "data"}
      </span>
    </span>
  );
}
