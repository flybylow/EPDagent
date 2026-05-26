import type { ResolvedPhase } from "@/lib/phases/registry";

export function formatPhaseTitle(phase: ResolvedPhase): string {
  if (phase.id === "docmap") return phase.name;
  const orderLabel = Number.isInteger(phase.order)
    ? String(phase.order)
    : String(phase.order);
  return `Phase ${orderLabel} · ${phase.name}`;
}
