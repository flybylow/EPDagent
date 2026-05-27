import { collapseTitle } from "./title-match";

/** Drop corrupted TOC lines (PDF header/footer merged into section number). */
export function isJunkDocmapEntry(number: string, title: string): boolean {
  const t = collapseTitle(title);
  if (!t) return true;
  if (/^\|/.test(t)) return true;
  if (/\|B-EPD/i.test(t)) return true;
  if (/^B-EPD[\d|]/i.test(t) && t.length < 60) return true;
  if (/^[\d|]{6,}$/.test(t.replace(/\s/g, ""))) return true;
  // Duplicate ghost "section 3" lines that are only an EPD id fragment
  if (/^3$/.test(number.trim()) && /B-EPD/i.test(t) && t.length < 40) return true;
  const parts = number.split(".").map((p) => Number(p));
  if (parts.some((p) => !Number.isFinite(p) || p < 1 || p > 20)) return true;
  if (/^\d{3,}$/.test(number.trim())) return true;
  if (/vilvoorde|brussels|belgium|diesel\/km|^\d+\s*%$/i.test(t)) return true;
  return false;
}
