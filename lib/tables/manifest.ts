import * as fs from "node:fs";
import * as path from "node:path";
import { REFERENCE_DIR } from "../paths";
import type { TableExportDef, TableExportManifest } from "./types";

export const TABLE_EXPORTS_DIR = path.join(process.cwd(), "out", "table_exports");

export function tableRegistryForStem(stem: string): TableExportDef[] {
  const refDirs = fs.existsSync(REFERENCE_DIR)
    ? fs.readdirSync(REFERENCE_DIR).filter((d) => {
        const p = path.join(REFERENCE_DIR, d, "tables.json");
        return fs.existsSync(p);
      })
    : [];

  for (const dir of refDirs) {
    const file = path.join(REFERENCE_DIR, dir, "tables.json");
    const data = JSON.parse(fs.readFileSync(file, "utf-8")) as {
      stem?: string;
      tables?: TableExportDef[];
    };
    if (data.stem === stem && data.tables?.length) {
      return data.tables;
    }
  }
  return [];
}

export function loadTableManifest(stem: string): TableExportManifest | null {
  const file = path.join(TABLE_EXPORTS_DIR, stem, "manifest.json");
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf-8")) as TableExportManifest;
}

export function writeTableManifest(manifest: TableExportManifest): string {
  const outDir = path.join(TABLE_EXPORTS_DIR, manifest.stem);
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, "manifest.json");
  fs.writeFileSync(file, JSON.stringify(manifest, null, 2));
  return file;
}
