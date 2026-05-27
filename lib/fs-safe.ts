import * as fs from "node:fs";

/** Avoid serverless crashes when env points at a missing or non-directory path. */
export function pathIsDirectory(dir: string): boolean {
  try {
    return fs.existsSync(dir) && fs.statSync(dir).isDirectory();
  } catch {
    return false;
  }
}

export function safeReaddir(dir: string): string[] {
  try {
    if (!pathIsDirectory(dir)) return [];
    return fs.readdirSync(dir);
  } catch {
    return [];
  }
}

export function safeReadJson<T>(filePath: string): T | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
  } catch {
    return null;
  }
}
