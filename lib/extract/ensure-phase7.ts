import { loadPhase7, pdfPathForStem } from "../data";
import { phase7BlockForSection } from "../phase7-epd-sections-content";
import { phase7TargetSections } from "./phase7-targets";
import { refreshPhase7TextForStem } from "./refresh-phase7-text";

/** True when at least one narrative phase-7 section (§11–§14) has extracted text. */
export function phase7IsCached(stem: string): boolean {
  const data = loadPhase7(stem);
  if (!data?.blocks?.length) return false;
  const targets = phase7TargetSections(stem).filter(
    (t) => !/application unit/i.test(t.title)
  );
  if (!targets.length) return false;
  return targets.every((t) =>
    Boolean(phase7BlockForSection(data, t.number, t.title)?.content?.trim())
  );
}

/** Build narrative sections from PDF text when phase 7 is missing or incomplete. */
export async function ensurePhase7ForStem(stem: string): Promise<void> {
  if (!pdfPathForStem(stem)) return;
  if (phase7IsCached(stem)) return;
  await refreshPhase7TextForStem(stem);
}
