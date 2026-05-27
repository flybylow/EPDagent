/** Fix per-glyph PDF spacing in headings (e.g. "S YSTEM" → "SYSTEM", "STAG E" → "STAGE"). */
export function collapsePdfLetterSpacing(text: string): string {
  let out = text.replace(/\s+/g, " ").trim();

  out = out.replace(/\b(?:[A-Za-z0-9] ){2,}[A-Za-z0-9]\b/g, (match) => {
    const parts = match.split(" ");
    return parts.every((p) => p.length === 1) ? parts.join("") : match;
  });

  out = out.replace(/\b([A-Za-z]) ([A-Za-z]{2,})\b/g, (match, first, rest) => {
    if (/^[A-Z]{2,}$/.test(rest) || /^[a-z]{2,}$/.test(rest)) return first + rest;
    return match;
  });

  out = out.replace(/\b([A-Za-z]{2,}) ([A-Za-z])(?=\s|$|\d)/g, (match, start, end) => {
    if (/^[A-Z]+$/.test(start) && /^[A-Z]$/.test(end)) return start + end;
    return match;
  });

  return out.replace(/\s+/g, " ").trim();
}

/** Collapse PDF spacing artefacts in section titles. */
export function collapseTitle(title: string): string {
  return collapsePdfLetterSpacing(title);
}

/** Short heading for nav / match strip — never show merged subsection text. */
export function navSectionTitle(title: string, sectionNumber?: string): string {
  let t = collapseTitle(title);

  const embedAt = t.search(/\s\d+(?:\.\d+)+[A-Za-z]/);
  if (embedAt > 0) t = t.slice(0, embedAt).trim();

  const stageAt = t.match(/\sSTAG[eE]\s+\d+/i);
  if (stageAt?.index != null && stageAt.index > 0) t = t.slice(0, stageAt.index).trim();

  const siblingAt = t.match(/\s1[1-9]\.\d+[A-Za-z]/);
  if (siblingAt?.index != null && siblingAt.index > 0) t = t.slice(0, siblingAt.index).trim();

  if (sectionNumber && t.length > 120) {
    const prefix = new RegExp(
      `^${sectionNumber.replace(/\./g, "\\.")}\\s+`,
      "i"
    );
    t = t.replace(prefix, "");
  }

  if (t.length > 100) t = `${t.slice(0, 97).trim()}…`;
  return t;
}

export function titleKey(title: string): string {
  return collapseTitle(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

export function titleMatches(title: string, pattern: RegExp): boolean {
  if (pattern.test(collapseTitle(title))) return true;
  const key = titleKey(title);
  const patternKey = pattern.source
    .replace(/\\s[*+]?/g, "")
    .replace(/[^a-z]/gi, "")
    .toLowerCase();
  return patternKey.length >= 6 && key.includes(patternKey);
}

export function isBibliographySection(sectionNumber: string, title: string): boolean {
  if (/bibliograph/i.test(title)) return true;
  if (/^16$/.test(sectionNumber) && /bibliograph/i.test(title)) return true;
  return false;
}

/** Narrative EPD sections extracted by phase 7 (numbering varies by publisher). */
export function isPhase7TargetSection(sectionNumber: string, title: string): boolean {
  if (isBibliographySection(sectionNumber, title)) return false;
  if (/^10(\.|$)/.test(sectionNumber)) return false;

  const t = collapseTitle(title).toLowerCase();
  if (/underlying scenarios used to calculate/i.test(t)) return false;
  if (/^10(\.|$)/.test(sectionNumber) && /technical information for scenario/i.test(t)) {
    return false;
  }
  if (
    /^13(\.|$)/.test(sectionNumber) &&
    /additional technical information|scenario development|interpretation/i.test(t)
  ) {
    return true;
  }

  if (/^11(\.|$)/.test(sectionNumber)) {
    if (/indoor|soil|water|additional environmental/i.test(t)) return true;
    return /^\d+\.\d+/.test(sectionNumber);
  }
  if (/demonstration of verification|verification of compliance/i.test(t)) return true;
  if (/application unit/i.test(t)) return true;
  if (/reversibilit/i.test(t)) return true;
  if (/indoor air|soil and water/i.test(t)) return true;

  return false;
}

export function isPhase7NarrativeSection(sectionNumber: string, title: string): boolean {
  return isPhase7TargetSection(sectionNumber, title);
}
