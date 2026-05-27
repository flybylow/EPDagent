import * as path from "node:path";
import { OUT_DIR } from "../paths";

const PROBE_DIR = path.join(OUT_DIR, "phase4_lca_probe");

function probeSuffix(pageSpec?: string): string | null {
  if (!pageSpec?.trim()) return null;
  const normalized = pageSpec.trim().replace(/\s+/g, "");
  return normalized ? `.p${normalized}` : null;
}

export function phase4ProbeOutputPath(stem: string, pageSpec?: string): string {
  const suffix = probeSuffix(pageSpec);
  const filename = suffix ? `${stem}${suffix}.json` : `${stem}.json`;
  return path.join(PROBE_DIR, filename);
}

export function phase4ProbeDir(): string {
  return PROBE_DIR;
}
