/** EN 15804-style section numbers (1, 1.2, 10.3). */
export function isValidSectionNumber(number: string): boolean {
  return /^\d+(?:\.\d+)*$/.test(number.trim());
}

/** Direct parent section number, e.g. "11.1" → "11", "1" → null. */
export function sectionParentNumber(number: string): string | null {
  const trimmed = number.trim();
  if (!isValidSectionNumber(trimmed)) return null;
  const parts = trimmed.split(".");
  if (parts.length <= 1) return null;
  return parts.slice(0, -1).join(".");
}
