/** Map full-extract step ids to dashboard pipeline phase ids. */
export function extractStepToPhaseId(stepId: string): string | null {
  if (stepId === "phase1") return "phase1";
  if (stepId === "docmap") return "docmap";
  if (stepId === "phase2") return "phase2";
  if (stepId === "phase3") return "phase3_product";
  if (stepId === "phase3-composition") return "phase3_composition";
  if (stepId === "phase3-lca-study") return "phase3_lca_study";
  if (stepId.startsWith("phase4-")) return "phase4_lca";
  if (stepId === "phase5") return "phase5_scenarios";
  if (stepId === "phase7") return "phase7_epd_sections";
  if (stepId === "phase6") return "phase6_refs";
  return null;
}
