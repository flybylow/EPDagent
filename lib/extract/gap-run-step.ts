import type { GapReason, GapRow } from "./gap-report";

/** Full-extract plan step id for a gap row (dashboard / gap panel Run). */
export function resolveGapExtractStepId(gap: GapRow): string | null {
  const msg = (gap.pendingMessage ?? "").toLowerCase();

  if (/phase3-composition|composition not extracted/.test(msg)) {
    return "phase3-composition";
  }
  if (/phase3-lca-study|lca study metadata/.test(msg)) {
    return "phase3-lca-study";
  }
  if (/npm run phase3[^-]/.test(msg) || /technical data not extracted/.test(msg)) {
    return "phase3";
  }
  if (/phase2|header draft/.test(msg)) return "phase2";
  if (/phase5|scenario/.test(msg)) return "phase5";
  if (/phase6|bibliograph|references not/.test(msg)) return "phase6";
  if (/phase7|missing steps/.test(msg)) return "phase7";
  if (/phase4-probe|lca table not|lca explanatory/.test(msg)) {
    if (gap.tableId) return `phase4-${gap.tableId}`;
    return null;
  }
  if (/docmap/.test(msg)) return "docmap";

  switch (gap.phaseId) {
    case "phase3_composition":
      return "phase3-composition";
    case "phase3_lca_study":
      return "phase3-lca-study";
    case "phase3_product":
      return "phase3";
    case "phase2":
      return "phase2";
    case "phase5_scenarios":
      return "phase5";
    case "phase6_refs":
      return "phase6";
    case "phase7_epd_sections":
      return "phase7";
    case "phase4_lca":
      return gap.tableId ? `phase4-${gap.tableId}` : null;
    default:
      break;
  }

  switch (gap.gapReason) {
    case "phase3_extract":
      if (gap.number === "1.5" || /composition/i.test(gap.title)) {
        return "phase3-composition";
      }
      if (gap.number === "5" || /system boundar|lca study/i.test(gap.title)) {
        return "phase3-lca-study";
      }
      return "phase3";
    case "phase4_probe":
      return gap.tableId ? `phase4-${gap.tableId}` : null;
    case "phase5_scenarios":
      return "phase5";
    case "phase6_refs":
      return "phase6";
    case "phase7_narrative":
    case "pipeline_pending":
      return "phase7";
    case "phase2_header":
      return "phase2";
    case "phase_empty":
      return resolveGapExtractStepId({ ...gap, gapReason: "unknown" });
    case "visual_only":
      return gap.tableId ? `phase4-${gap.tableId}` : null;
    default:
      return null;
  }
}

export function gapRunStepLabel(stepId: string): string {
  if (stepId === "phase3-composition") return "Run composition";
  if (stepId === "phase3-lca-study") return "Run LCA study";
  if (stepId === "phase3") return "Run product";
  if (stepId === "phase2") return "Run cover";
  if (stepId === "phase5") return "Run scenarios";
  if (stepId === "phase6") return "Run references";
  if (stepId === "phase7") return "Run narrative";
  if (stepId.startsWith("phase4-")) return "Run LCA table";
  if (stepId === "docmap") return "Run docmap";
  return "Run extract";
}

/** Whether Run should default to force (phase ran but section still empty). */
export function gapRunShouldForce(gap: GapRow): boolean {
  return gap.gapReason === "phase_empty";
}

export function gapRunDisabledReason(gap: GapRow, stepId: string | null): string | null {
  if (stepId) return null;
  if (gap.gapReason === "no_mapping") {
    return "No extract step — add section template mapping first";
  }
  return "No runnable extract step for this gap";
}
