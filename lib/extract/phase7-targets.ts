import { loadDocmapForStem } from "../phases/registry";
import { phase7BlockForSection } from "../phase7-epd-sections-content";
import {
  isPhase7TargetSection,
  navSectionTitle,
} from "../navigation/title-match";
import type { Phase7EpdSectionsData } from "../types";
import { repairFlatTocEntries } from "./docmap-parse";

export interface Phase7TargetSection {
  number: string;
  title: string;
}

/** EN 15804 +1 numbering (§14 application unit, §15 reversibility) — common on B-EPD / ETEX. */
const FALLBACK_TARGETS: Phase7TargetSection[] = [
  { number: "11.1", title: "Indoor air" },
  { number: "11.2", title: "Soil and water" },
  { number: "12", title: "Demonstration of verification" },
  { number: "14", title: "Application unit" },
  { number: "15", title: "Additional information on reversibility" },
];

/** Docmap/heading scan sometimes labels §11.1 as section 11 with title "Indoor air". */
function normalizePhase7Targets(targets: Phase7TargetSection[]): Phase7TargetSection[] {
  const out: Phase7TargetSection[] = [];
  const has = (n: string) => out.some((t) => t.number === n);

  for (const t of targets) {
    const titleLow = t.title.toLowerCase();
    if (t.number === "11" && /indoor\s*air/i.test(titleLow)) {
      if (!has("11.1")) out.push({ number: "11.1", title: "Indoor air" });
      continue;
    }
    if (t.number === "11" && /soil|water/i.test(titleLow)) {
      if (!has("11.2")) out.push({ number: "11.2", title: "Soil and water" });
      continue;
    }
    if (
      t.number === "11" &&
      /release|dangerous|substances|additional environmental/i.test(titleLow)
    ) {
      if (!has("11.1")) out.push({ number: "11.1", title: "Indoor air" });
      if (!has("11.2")) out.push({ number: "11.2", title: "Soil and water" });
      continue;
    }
    if (!has(t.number)) out.push(t);
  }

  if (has("11.2") && !has("11.1")) {
    out.unshift({ number: "11.1", title: "Indoor air" });
  }
  return out;
}

export function phase7TargetSections(stem: string): Phase7TargetSection[] {
  const docmap = loadDocmapForStem(stem);
  const flat = docmap?.flat_entries.length
    ? repairFlatTocEntries(docmap.flat_entries)
    : [];
  if (!flat.length) return FALLBACK_TARGETS;

  const targets = normalizePhase7Targets(
    flat
      .filter((e) => isPhase7TargetSection(e.number, e.title))
      .map((e) => ({
        number: e.number,
        title: navSectionTitle(e.title, e.number),
      }))
  );

  return targets.length ? targets : FALLBACK_TARGETS;
}

export function phase7TargetsPromptList(targets: Phase7TargetSection[]): string {
  return targets.map((t) => `- ${t.number}: ${t.title}`).join("\n");
}

export function phase7TargetsSatisfied(
  stem: string,
  data: Phase7EpdSectionsData | null
): boolean {
  const targets = phase7TargetSections(stem);
  if (!targets.length) return false;
  return targets.every((t) => {
    const block = phase7BlockForSection(data, t.number, t.title);
    return Boolean(block?.content?.trim());
  });
}
