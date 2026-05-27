import { tableRegistryForStem } from "../tables/manifest";

export interface ExtractPlanStep {
  id: string;
  label: string;
}

export type ExtractProgressEvent =
  | { type: "plan"; steps: ExtractPlanStep[] }
  | { type: "start"; stepId: string; label: string; index: number; total: number }
  | { type: "skip"; stepId: string; label: string; index: number; total: number }
  | {
      type: "done";
      stepId: string;
      label: string;
      index: number;
      total: number;
      ok: boolean;
      skipped?: boolean;
      error?: string;
    }
  | { type: "complete"; result: unknown }
  | { type: "error"; message: string };

export function buildExtractPlan(stem: string, options: { exportTables?: boolean } = {}): ExtractPlanStep[] {
  const plan: ExtractPlanStep[] = [
    { id: "phase1", label: "Phase 1 · filename" },
    { id: "docmap", label: "Docmap · table of contents" },
    { id: "phase2", label: "Phase 2 · header" },
    { id: "phase3", label: "Phase 3 · product" },
    { id: "phase3-composition", label: "Phase 3 · composition" },
    { id: "phase3-lca-study", label: "Phase 3 · LCA study" },
  ];

  for (const table of tableRegistryForStem(stem).filter((t) => t.phase === "phase4_lca")) {
    plan.push({
      id: `phase4-${table.id}`,
      label: `Phase 4 · ${table.title}`,
    });
  }

  plan.push(
    { id: "phase5", label: "Phase 5 · scenarios" },
    { id: "phase6", label: "Phase 6 · bibliography" },
    { id: "phase7", label: "Phase 7 · narrative sections" }
  );

  if (options.exportTables) {
    plan.push({ id: "export-tables", label: "Export table PNGs" });
  }

  plan.push({ id: "drafts", label: "Drafts & knowledge graph" });
  return plan;
}

export function logExtractProgress(event: ExtractProgressEvent): void {
  switch (event.type) {
    case "plan":
      console.log(`[extract] plan (${event.steps.length} steps):`, event.steps.map((s) => s.id).join(", "));
      break;
    case "start":
      console.log(`[extract] (${event.index}/${event.total}) start ${event.stepId} — ${event.label}`);
      break;
    case "skip":
      console.log(`[extract] (${event.index}/${event.total}) skip ${event.stepId} (cached)`);
      break;
    case "done":
      if (event.skipped) break;
      console.log(
        `[extract] (${event.index}/${event.total}) ${event.ok ? "ok" : "FAIL"} ${event.stepId}`,
        event.error ?? ""
      );
      break;
    case "error":
      console.error("[extract] error:", event.message);
      break;
    case "complete":
      console.log("[extract] complete");
      break;
  }
}
