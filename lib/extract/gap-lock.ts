import * as fs from "node:fs";
import * as path from "node:path";
import { ROOT } from "../paths";

export type GapLockStatus = "open" | "accepted" | "fixed";

export interface GapLockEntry {
  status: GapLockStatus;
  note?: string;
  lockedAt: string;
  gapReason?: string;
}

export interface GapLockFile {
  stem: string;
  updatedAt: string;
  locks: Record<string, GapLockEntry>;
}

function safeStemFile(stem: string): string {
  return stem.replace(/[^\w.-]+/g, "_").slice(0, 120);
}

export function gapLockPath(stem: string): string {
  return path.join(ROOT, "data", "gap-locks", `${safeStemFile(stem)}.json`);
}

export function loadGapLocks(stem: string): GapLockFile {
  const file = gapLockPath(stem);
  if (!fs.existsSync(file)) {
    return { stem, updatedAt: new Date().toISOString(), locks: {} };
  }
  return JSON.parse(fs.readFileSync(file, "utf-8")) as GapLockFile;
}

export function saveGapLock(
  stem: string,
  sectionId: string,
  status: GapLockStatus,
  note?: string,
  gapReason?: string
): string {
  const file = gapLockPath(stem);
  const data = loadGapLocks(stem);
  data.locks[sectionId] = {
    status,
    note,
    gapReason,
    lockedAt: new Date().toISOString(),
  };
  data.updatedAt = new Date().toISOString();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  return file;
}
