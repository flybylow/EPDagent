import { collapsePdfLetterSpacing } from "../navigation/title-match";

/** Normalize extracted PDF text for display (headings and body). */
export function formatDisplayText(text: string | null | undefined): string {
  if (!text?.trim()) return "";
  return collapsePdfLetterSpacing(text);
}
