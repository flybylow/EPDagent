import { phase7BlockForSection } from "../phase7-epd-sections-content";
import type { Phase2Data, Phase7EpdSectionsData } from "../types";

/** Pull verifier name from phase 7 §12 block when the cover slice omitted it. */
export function verifierNameFromPhase7(
  phase7: Phase7EpdSectionsData | null
): string | null {
  const block = phase7BlockForSection(phase7, "12", "Demonstration of verification");
  const text = block?.content?.trim();
  if (!text) return null;

  const patterns = [
    /Third party verifier:\s*([^\n,]+(?:\([^)]+\))?)/i,
    /Third-party verifier:\s*([^\n,]+(?:\([^)]+\))?)/i,
    /Verifier:\s*([^\n,]+(?:\([^)]+\))?)/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1]?.trim()) return m[1].trim();
  }
  return null;
}

/** Fill header gaps from later narrative extraction (verifier, etc.). */
export function enrichPhase2Data(
  phase2: Phase2Data | null,
  phase7: Phase7EpdSectionsData | null
): Phase2Data | null {
  if (!phase2) return null;

  const verifierName = phase2.verifier?.name?.trim() || verifierNameFromPhase7(phase7);
  if (!verifierName) return phase2;

  return {
    ...phase2,
    verifier: {
      ...phase2.verifier,
      name: verifierName,
      type: phase2.verifier?.type ?? "independent_third_party",
    },
  };
}

export function phase2HasCoverContent(phase2: Phase2Data | null): boolean {
  if (!phase2) return false;
  return Boolean(
    phase2.product_name?.trim() ||
      phase2.epd_number?.trim() ||
      phase2.declared_scope?.trim() ||
      phase2.program_operator?.trim()
  );
}

export function coverPdfPage(phase2: Phase2Data | null): number {
  const resolved = phase2?._source?.api_pages_resolved;
  if (typeof resolved === "string" && resolved.trim()) {
    const first = Number(resolved.split(",")[0]?.trim());
    if (Number.isFinite(first) && first >= 1) return first;
  }
  return 1;
}
