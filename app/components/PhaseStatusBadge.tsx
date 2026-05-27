import type { PhaseStatus } from "@/lib/phases/registry";

export function PhaseStatusBadge({
  status,
  compact = false,
}: {
  status: PhaseStatus;
  compact?: boolean;
}) {
  const label =
    status === "ready"
      ? compact
        ? "R"
        : "Ready"
      : status === "visual_only"
        ? compact
          ? "V"
          : "Visual"
        : status === "empty"
          ? compact
            ? "E"
            : "Empty"
          : compact
            ? "P"
            : "Pending";

  return (
    <span
      className={`phase-status phase-status-${status}${compact ? " phase-status-compact" : ""}`}
      title={
        compact
          ? status === "ready"
            ? "Ready"
            : status === "visual_only"
              ? "Visual only"
              : status === "empty"
                ? "Empty"
                : "Pending"
          : undefined
      }
    >
      {label}
    </span>
  );
}
