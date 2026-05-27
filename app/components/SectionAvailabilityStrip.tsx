import type { SectionAvailability } from "@/lib/templates/section-view-types";

export function SectionAvailabilityStrip({
  availability,
  side,
}: {
  availability: SectionAvailability;
  side: "pdf" | "content";
}) {
  if (side === "pdf") {
    if (availability.hasPdfLink) {
      return (
        <p className="section-availability section-availability-ok">
          PDF linked · page {availability.pdfPage}
        </p>
      );
    }
    if (!availability.pdfAvailable) {
      return (
        <p className="section-availability section-availability-missing">
          No PDF file in <code>data/EPD/</code> for this EPD.
        </p>
      );
    }
    return (
      <p className="section-availability section-availability-missing">
        No page mapped for this section in the document index.
      </p>
    );
  }

  if (availability.hasExtractedContent) {
    return (
      <p className="section-availability section-availability-ok">
        Structured content available
      </p>
    );
  }

  if (availability.hasVisualExport) {
    return (
      <p className="section-availability section-availability-visual">
        PDF table export only — structured extraction pending
      </p>
    );
  }

  return (
    <p className="section-availability section-availability-missing">
      {availability.pendingMessage ?? "No extracted content for this section yet."}
    </p>
  );
}
