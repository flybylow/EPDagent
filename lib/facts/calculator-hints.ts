import type { Phase2Data, Phase3ProductData } from "../types";
import { loadPhase4Probes } from "../extract/phase4-probes";
import { buildLcaIndicators, pickPrimaryGwp } from "./lca-slice";
import { isThermalProperty } from "./tags";
import type { CalculatorHints } from "./types";

function parseNumber(raw: string | null | undefined): number | null {
  if (!raw?.trim()) return null;
  const n = Number(raw.replace(",", ".").trim());
  return Number.isFinite(n) ? n : null;
}

function formatDeclaredUnit(phase2: Phase2Data | null): string | null {
  const du = phase2?.declared_unit;
  if (!du) return null;
  if (du.value != null && du.unit) return `${du.value} ${du.unit}`;
  return du.unit ?? (du.value != null ? String(du.value) : null);
}

export function buildCalculatorHints(
  stem: string,
  phase2: Phase2Data | null,
  phase3: Phase3ProductData | null,
  functionalUnit: string | null = null
): CalculatorHints {
  const thermalRow = phase3?.technical_properties?.find(isThermalProperty) ?? null;

  const probes = loadPhase4Probes(stem);
  const indicators = Object.keys(probes).length ? buildLcaIndicators(probes) : {};
  const gwp = pickPrimaryGwp(indicators);

  return {
    thermal: thermalRow
      ? {
          lambda_W_mK: parseNumber(thermalRow.value),
          property_label: thermalRow.property,
          standard: thermalRow.standard,
          unit: thermalRow.unit,
        }
      : null,
    carbon: gwp
      ? {
          gwp_a1_a3: gwp.a1_a3,
          gwp_unit: gwp.unit,
          declared_unit: formatDeclaredUnit(phase2),
          functional_unit: functionalUnit,
        }
      : phase2?.declared_unit
        ? {
            gwp_a1_a3: null,
            gwp_unit: null,
            declared_unit: formatDeclaredUnit(phase2),
            functional_unit: functionalUnit,
          }
        : null,
  };
}
