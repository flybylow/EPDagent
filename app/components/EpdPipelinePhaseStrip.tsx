import { EpdPhaseLights } from "@/app/components/EpdPhaseLights";
import type { PipelinePhaseSummary } from "@/lib/types";

/** @deprecated Use {@link EpdPhaseLights} */
export function EpdPipelinePhaseStrip({ phases }: { phases: PipelinePhaseSummary[] }) {
  return <EpdPhaseLights phases={phases} />;
}
