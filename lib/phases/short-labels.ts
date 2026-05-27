/** Compact labels for dashboard phase badges. */
export const PHASE_SHORT_LABELS: Record<string, string> = {
  docmap: "DM",
  phase1: "P1",
  phase2: "P2",
  phase3_product: "P3",
  phase3_composition: "3C",
  phase3_lca_study: "3L",
  phase4_lca: "P4",
  phase5_scenarios: "P5",
  phase7_epd_sections: "P7",
  phase6_refs: "P6",
};

export function phaseShortLabel(phaseId: string): string {
  return PHASE_SHORT_LABELS[phaseId] ?? phaseId.replace(/^phase/, "P").slice(0, 3);
}
