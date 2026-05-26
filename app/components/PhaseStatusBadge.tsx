import type { PhaseStatus } from "@/lib/phases/registry";

export function PhaseStatusBadge({ status }: { status: PhaseStatus }) {
  const label =
    status === "ready"
      ? "Ready"
      : status === "visual_only"
        ? "Visual"
        : status === "empty"
          ? "Empty"
          : "Pending";

  return <span className={`phase-status phase-status-${status}`}>{label}</span>;
}
