import { titleKey } from "./navigation/title-match";
import type { Phase7EpdSectionsData } from "./types";

function titleOverlap(a: string, b: string): boolean {
  const ka = titleKey(a);
  const kb = titleKey(b);
  if (!ka || !kb) return false;
  if (ka === kb) return true;
  if (ka.length < 6 || kb.length < 6) return false;
  const minLen = Math.min(ka.length, kb.length, 18);
  return ka.includes(kb.slice(0, minLen)) || kb.includes(ka.slice(0, minLen));
}

export function phase7BlockForSection(
  data: Phase7EpdSectionsData | null,
  sectionId: string,
  sectionTitle?: string
): { number: string | null; title: string | null; content: string | null } | null {
  if (!data?.blocks.length) return null;

  const indoorBlock = () =>
    data.blocks.find(
      (b) =>
        b.content?.trim() &&
        (b.number === "11.1" ||
          (b.number === "11" && /indoor\s*air/i.test(b.title ?? "")))
    );

  if (sectionId === "11.1" || (sectionTitle && /indoor\s*air/i.test(sectionTitle))) {
    const block = indoorBlock();
    if (block) {
      return {
        number: "11.1",
        title: sectionTitle ?? block.title ?? "Indoor air",
        content: block.content,
      };
    }
  }

  if (sectionId === "11.2" || (sectionTitle && /soil|water/i.test(sectionTitle))) {
    const block = data.blocks.find(
      (b) =>
        b.content?.trim() &&
        (b.number === "11.2" ||
          (b.number === "11" && /soil|water/i.test(b.title ?? "")))
    );
    if (block) {
      return {
        number: "11.2",
        title: sectionTitle ?? block.title ?? "Soil and water",
        content: block.content,
      };
    }
  }

  if (sectionTitle) {
    const byTitle = data.blocks.find(
      (b) => b.content?.trim() && titleOverlap(sectionTitle, b.title ?? "")
    );
    if (byTitle) return byTitle;

    const t = sectionTitle.toLowerCase();
    if (/application unit/i.test(t)) {
      const block = data.blocks.find(
        (b) =>
          b.content?.trim() &&
          (/application unit/i.test(b.title ?? "") ||
            b.number === "13" ||
            b.number === "14" ||
            b.number === "15")
      );
      if (block) return block;
    }
    if (/reversibility/i.test(t)) {
      const block = data.blocks.find(
        (b) =>
          b.content?.trim() &&
          (/reversibility/i.test(b.title ?? "") ||
            b.number === "14" ||
            b.number === "15" ||
            b.number === "16")
      );
      if (block) return block;
    }
    if (/scenario development|additional technical information/i.test(t)) {
      const block = data.blocks.find(
        (b) =>
          b.content?.trim() &&
          (b.number === "13" || /scenario development|technical information/i.test(b.title ?? ""))
      );
      if (block) return block;
    }
    if (/verification|demonstration/i.test(t) && !/program/i.test(t)) {
      const block = data.blocks.find(
        (b) =>
          b.content?.trim() &&
          (/verif/i.test(b.title ?? "") || b.number === "12")
      );
      if (block) return block;
    }
  }

  const exact = data.blocks.find((b) => b.number === sectionId);
  if (exact?.content?.trim()) {
    if (!sectionTitle || !exact.title?.trim() || titleOverlap(sectionTitle, exact.title)) {
      return exact;
    }
  }

  if (sectionId === "11") {
    const parts = data.blocks.filter((b) => b.number?.startsWith("11."));
    if (!parts.length) return null;
    return {
      number: "11",
      title: "Additional environmental information",
      content: parts.map((p) => `${p.title ?? p.number}\n\n${p.content}`).join("\n\n"),
    };
  }
  return null;
}

export function phase7HasContent(data: Phase7EpdSectionsData | null): boolean {
  return (data?.blocks.some((b) => b.content?.trim()) ?? false);
}
