import type { GapReason } from "./gap-report";

export const GAP_REASON_LABELS: Record<GapReason, string> = {
  phase2_header: "Header / draft",
  phase3_extract: "Product / LCA study",
  phase4_probe: "LCA tables",
  phase5_scenarios: "Scenarios",
  phase6_refs: "References",
  phase7_narrative: "Narrative sections",
  pipeline_pending: "Pipeline",
  no_mapping: "Section template",
  phase_empty: "Phase output empty",
  visual_only: "Visual only",
  unknown: "Unknown",
};

export function gapSuggestedAction(reason: GapReason): string {
  switch (reason) {
    case "no_mapping":
      return "Add mapping in section-view template or section-view-infer.ts";
    case "phase4_probe":
      return "Check tables.json probe pages; run phase4-probe with --force";
    case "phase3_extract":
      return "Run phase3 / phase3-composition / phase3-lca-study; check subsection numbers in output JSON";
    case "phase5_scenarios":
      return "Run npm run phase5 (or missing steps)";
    case "phase6_refs":
      return "Run npm run phase6";
    case "phase7_narrative":
      return "Run phase7; check phase7 targets and PDF page range";
    case "pipeline_pending":
      return "Run missing steps on the dashboard";
    case "phase2_header":
      return "Run npm run phase2 then drafts";
    case "phase_empty":
      return "Phase ran but this section has no field; fix template paths or extract pages";
    case "visual_only":
      return "Table PNG only — run phase4-probe for structured data";
    default:
      return "Open section in Compare and check pending message";
  }
}
