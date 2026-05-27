import type { Phase2Data, Phase3ProductData } from "../types";
import type { ProductType } from "./types";
import { PRODUCT_TYPES } from "./types";

const TYPE_RULES: Array<{ type: ProductType; pattern: RegExp }> = [
  {
    type: "insulation",
    pattern:
      /\b(insulat|isolati|λ|lambda|thermal\s+(board|slab|conduct)|\bRd\b|w\/m\.?k|en\s*13162|mineral\s+wool|rockwool|kingspan|kooltherm|ursa|xps|eps|pir)\b/i,
  },
  { type: "gypsum", pattern: /\b(gyproc|gypsum|plasterboard|drywall)\b/i },
  { type: "concrete", pattern: /\b(concrete|cement|beton|mortar|cem\s)/i },
  { type: "windows", pattern: /\b(window|façade|facade|aluminium\s+profile|star\s*75|kip)\b/i },
  { type: "roofing", pattern: /\b(roof|derbigum|membrane|bitumen)\b/i },
  { type: "paint", pattern: /\b(paint|coating|dragopaint|velout)\b/i },
  { type: "masonry", pattern: /\b(brick|block|carbstone|earth\s+block|masonry)\b/i },
];

const THERMAL_PROPERTY = /\b(λ|lambda|thermal|conductiv|resistance|\bRd\b)/i;

const TYPE_PRIORITY: ProductType[] = [
  "insulation",
  "gypsum",
  "concrete",
  "windows",
  "roofing",
  "masonry",
  "paint",
  "other",
];

export function productSearchText(
  phase2: Phase2Data | null,
  phase3: Phase3ProductData | null,
  stem?: string
): string {
  return [
    stem,
    phase2?.product_name,
    phase2?.product_description,
    phase2?.producer?.name,
    phase3?.description,
    phase3?.intended_use,
  ]
    .filter(Boolean)
    .join(" ");
}

export function inferProductTypes(
  phase2: Phase2Data | null,
  phase3: Phase3ProductData | null,
  stem?: string
): ProductType[] {
  const text = productSearchText(phase2, phase3, stem);
  const found = new Set<ProductType>();
  for (const { type, pattern } of TYPE_RULES) {
    if (pattern.test(text)) found.add(type);
  }
  if (phase3?.technical_properties?.some((r) => THERMAL_PROPERTY.test(r.property ?? ""))) {
    found.add("insulation");
  }
  if (!found.size) found.add("other");
  return TYPE_PRIORITY.filter((t) => found.has(t));
}

export function inferPrimaryType(types: ProductType[]): ProductType {
  return types[0] ?? "other";
}

/** String tags for API compat (types + `thermal-data` when λ present). */
export function inferProductTags(
  phase2: Phase2Data | null,
  phase3: Phase3ProductData | null,
  stem?: string
): string[] {
  const tags: string[] = [...inferProductTypes(phase2, phase3, stem)];
  if (
    phase3?.technical_properties?.some((r) => THERMAL_PROPERTY.test(r.property ?? "")) &&
    !tags.includes("thermal-data")
  ) {
    tags.push("thermal-data");
  }
  return tags;
}

export function isThermalProperty(row: { property: string | null }): boolean {
  return THERMAL_PROPERTY.test(row.property ?? "");
}

export function recordMatchesTag(tags: string[], wanted: string): boolean {
  return tags.includes(wanted.trim().toLowerCase());
}

export function recordMatchesType(types: ProductType[], wanted: string): boolean {
  const key = wanted.trim().toLowerCase() as ProductType;
  return (PRODUCT_TYPES as readonly string[]).includes(key) && types.includes(key);
}

export function recordMatchesTypes(types: ProductType[], wanted: string[]): boolean {
  if (!wanted.length) return true;
  return wanted.some((w) => recordMatchesType(types, w));
}

export function parseTypeList(raw: string | null): ProductType[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter((t): t is ProductType => (PRODUCT_TYPES as readonly string[]).includes(t));
}

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  insulation: "Insulation",
  gypsum: "Gypsum / boards",
  concrete: "Concrete / cement",
  windows: "Windows / façades",
  roofing: "Roofing",
  paint: "Paints / coatings",
  masonry: "Masonry / blocks",
  other: "Other",
};
