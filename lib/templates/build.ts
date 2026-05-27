import type { DraftDocument, DraftTemplate, MergedPhaseData } from "./types";
import { formatDisplayValue, resolvePath } from "./resolve";

export function buildDraft(
  stem: string,
  data: MergedPhaseData,
  template: DraftTemplate
): DraftDocument {
  const pdfFilename =
    (data.phase2?._source?.pdf_filename as string | undefined) ??
    data.phase1?.pdf_filename ??
    null;

  const sections = template.sections.map((section) => ({
    id: section.id,
    title: section.title,
    fields: section.fields.map((field) => {
      let resolved = resolvePath(data, field.path);
      if (
        (resolved.value === null || resolved.value === "") &&
        field.fallbackPath
      ) {
        resolved = resolvePath(data, field.fallbackPath);
      }
      const { value, sourcePhase } = resolved;
      const displayValue = formatDisplayValue(value, field.format, field.enumLabels);
      return {
        id: field.id ?? field.path.replace(/\./g, "_"),
        label: field.label,
        path: field.path,
        value,
        displayValue,
        sourcePhase,
        empty:
          value === null ||
          value === "" ||
          (Array.isArray(value) && value.length === 0),
      };
    }),
  }));

  const productName = data.phase2?.product_name;
  const epdNumber = data.phase2?.epd_number ?? data.phase1?.epd_number;

  return {
    templateId: template.id,
    templateVersion: template.version,
    stem,
    title: productName ?? epdNumber ?? stem,
    pdfFilename,
    generatedAt: new Date().toISOString(),
    sections,
  };
}
