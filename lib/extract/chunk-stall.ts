import type { FullExtractStep } from "./full-extract";
import { formatExtractFailureSummary } from "./phase-run-state";

export function formatChunkStallMessage(
  pendingLabels: string[],
  lastSteps: FullExtractStep[]
): string {
  const failed = formatExtractFailureSummary(lastSteps);
  if (failed) return failed;

  const pending =
    pendingLabels.length > 0
      ? pendingLabels.slice(0, 3).join("; ") +
        (pendingLabels.length > 3 ? ` (+${pendingLabels.length - 3} more)` : "")
      : "unknown step";

  const hint =
    pendingLabels.some((l) => /phase 7|narrative/i.test(l)) &&
    pendingLabels.length === 1
      ? " Use Run narrative in the gap panel, or Re-extract all with force (phase 7 widens docmap pages automatically)."
      : " The step may have timed out — use gap-panel Run buttons or Re-extract all with force.";

  return `Extract could not finish ${pending}.${hint}`;
}
