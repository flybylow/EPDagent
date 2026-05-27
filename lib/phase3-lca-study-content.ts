import type { Phase3LcaStudyData } from "./types";

/** True when any structured LCA study field has content. Safe for client bundles. */
export function phase3LcaStudyHasContent(data: Phase3LcaStudyData | null): boolean {
  if (!data) return false;
  const textFields: (keyof Phase3LcaStudyData)[] = [
    "section_title",
    "standards_and_methodology",
    "pcr_reference",
    "lca_software_and_database",
    "goal_and_scope",
    "functional_unit",
    "system_boundaries",
    "production_sites",
    "cut_off_criteria",
    "allocation",
    "data_quality",
    "time_representativeness",
    "geographical_representativeness",
    "technology_representativeness",
    "impact_assessment",
    "interpretation",
  ];
  if (
    textFields.some((k) => {
      const v = data[k];
      return typeof v === "string" && v.trim().length > 0;
    })
  ) {
    return true;
  }
  if ((data.additional_paragraphs?.length ?? 0) > 0) return true;
  return (
    data.subsections?.some((s) => typeof s.content === "string" && s.content.trim().length > 0) ??
    false
  );
}
