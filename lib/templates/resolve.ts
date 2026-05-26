import type { MergedPhaseData } from "./types";

function getByPath(data: MergedPhaseData, dotPath: string): unknown {
  const [root, ...rest] = dotPath.split(".");
  if (root !== "phase1" && root !== "phase2") return undefined;

  let current: unknown = root === "phase1" ? data.phase1 : data.phase2;
  for (const key of rest) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function normalizeValue(raw: unknown): string | number | string[] | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw === "string" || typeof raw === "number") return raw;
  if (Array.isArray(raw) && raw.every((item) => typeof item === "string")) {
    return raw as string[];
  }
  return null;
}

export function resolvePath(data: MergedPhaseData, dotPath: string): {
  value: string | number | string[] | null;
  sourcePhase: "phase1" | "phase2" | null;
} {
  const sourcePhase = dotPath.startsWith("phase1.") ? "phase1" : dotPath.startsWith("phase2.") ? "phase2" : null;
  return { value: normalizeValue(getByPath(data, dotPath)), sourcePhase };
}

export function formatDisplayValue(
  value: string | number | string[] | null,
  format: "text" | "date" | "date-eu" | "enum" | "list" = "text",
  enumLabels?: Record<string, string>
): string {
  if (value === null || value === "") return "—";

  if (format === "list" && Array.isArray(value)) {
    return value.length ? value.join(" · ") : "—";
  }

  if (format === "enum" && typeof value === "string" && enumLabels?.[value]) {
    return enumLabels[value];
  }

  if ((format === "date" || format === "date-eu") && typeof value === "string") {
    const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (iso && format === "date-eu") {
      return `${iso[3]}.${iso[2]}.${iso[1]}`;
    }
    return value;
  }

  return String(value);
}
