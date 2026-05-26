import { createHash } from "node:crypto";

const DEFAULT_BASE = "http://localhost:3000/id";

export function iriBase(): string {
  const base = process.env.EPDAGENT_IRI_BASE ?? DEFAULT_BASE;
  return base.replace(/\/$/, "");
}

function slugify(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex").slice(0, 12);
}

export function epdIri(stem: string): string {
  return `${iriBase()}/epd/${encodeURIComponent(stem)}`;
}

export function orgIri(name: string | null | undefined): string | null {
  if (!name?.trim()) return null;
  return `${iriBase()}/org/${slugify(name)}`;
}

export function operatorIri(code: string | null | undefined): string | null {
  if (!code?.trim()) return null;
  return `${iriBase()}/operator/${encodeURIComponent(code.trim())}`;
}

export function personIri(name: string | null | undefined): string | null {
  if (!name?.trim()) return null;
  return `${iriBase()}/person/${slugify(name)}`;
}
