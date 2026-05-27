import {
  loadPhase1,
  loadPhase2,
  loadPhase3,
  loadPhase3Composition,
  loadPhase3LcaStudy,
  loadPhase5,
  loadPhase6,
  loadPhase7,
} from "../data";
import { enrichPhase2Data } from "../extract/phase2-enrich";
import { loadPhase4Probes } from "../extract/phase4-probes";
import type {
  Phase1Data,
  Phase2Data,
  Phase3CompositionData,
  Phase3LcaStudyData,
  Phase3ProductData,
  Phase4LcaProbeData,
  Phase5ScenariosData,
  Phase6RefsData,
  Phase7EpdSectionsData,
} from "../types";

export interface EpdGraphInput {
  stem: string;
  phase1: Phase1Data | null;
  phase2: Phase2Data | null;
  phase3: Phase3ProductData | null;
  phase3Composition: Phase3CompositionData | null;
  phase3LcaStudy: Phase3LcaStudyData | null;
  phase4Probes: Record<string, Phase4LcaProbeData>;
  phase5: Phase5ScenariosData | null;
  phase6: Phase6RefsData | null;
  phase7: Phase7EpdSectionsData | null;
}

export function loadEpdGraphInput(stem: string): EpdGraphInput {
  return {
    stem,
    phase1: loadPhase1(stem),
    phase2: enrichPhase2Data(loadPhase2(stem), loadPhase7(stem)),
    phase3: loadPhase3(stem),
    phase3Composition: loadPhase3Composition(stem),
    phase3LcaStudy: loadPhase3LcaStudy(stem),
    phase4Probes: loadPhase4Probes(stem),
    phase5: loadPhase5(stem),
    phase6: loadPhase6(stem),
    phase7: loadPhase7(stem),
  };
}

export function graphInputHasData(input: EpdGraphInput): boolean {
  return Boolean(
    input.phase1 ||
      input.phase2 ||
      input.phase3 ||
      input.phase3Composition ||
      input.phase3LcaStudy ||
      Object.keys(input.phase4Probes).length ||
      input.phase5 ||
      input.phase6 ||
      input.phase7
  );
}
