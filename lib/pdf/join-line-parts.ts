/** Average glyph width (px) for typical EPD TOC fonts at extracted scale. */
const CHAR_WIDTH_PX = 5;

/**
 * Join positioned PDF text fragments on one line.
 * Inserts a space only when horizontal gap suggests a word boundary (not per-glyph kerning).
 */
export function joinLineParts(parts: Array<{ x: number; text: string }>): string {
  if (!parts.length) return "";
  const sorted = [...parts].sort((a, b) => a.x - b.x);
  let result = sorted[0].text;

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    const prevEnd = prev.x + prev.text.length * CHAR_WIDTH_PX;
    const spaceGap = cur.x - prevEnd;
    result += (spaceGap > CHAR_WIDTH_PX * 1.2 ? " " : "") + cur.text;
  }

  return result.replace(/\s+/g, " ").trim();
}
