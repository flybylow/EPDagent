import type { Phase2Data, Phase3ProductData } from "../types";

const INSULATION_HINTS =
  /\b(insulat|isolati|λ|lambda|thermal\s+(board|slab|conduct)|\bRd\b|w\/m\.?k|en\s*13162|mineral\s+wool|rockwool|kingspan|ursa|xps|eps|pir)\b/i;

const GYPSUM_HINTS = /\b(gyproc|gypsum|plasterboard|drywall)\b/i;
const CONCRETE_HINTS = /\b(concrete|cement|beton|mortar)\b/i;

export function inferProductTags(
  phase2: Phase2Data | null,
  phase3: Phase3ProductData | null
): string[] {
  const text = [
    phase2?.product_name,
    phase2?.product_description,
    phase3?.description,
    phase3?.intended_use,
  ]
    .filter(Boolean)
    .join(" ");

  const tags = new Set<string>();
  if (INSULATION_HINTS.test(text)) tags.add("insulation");
  if (GYPSUM_HINTS.test(text)) tags.add("gypsum");
  if (CONCRETE_HINTS.test(text)) tags.add("concrete");
  if (phase3?.technical_properties?.some((r) => THERMAL_PROPERTY.test(r.property ?? ""))) {
    tags.add("thermal-data");
  }
  return [...tags];
}

const THERMAL_PROPERTY = /\b(λ|lambda|thermal|conductiv|resistance|\bRd\b)/i;

export function isThermalProperty(row: { property: string | null }): boolean {
  return THERMAL_PROPERTY.test(row.property ?? "");
}

export function recordMatchesTag(
  tags: string[],
  wanted: string
): boolean {
  return tags.includes(wanted.trim().toLowerCase());
}
