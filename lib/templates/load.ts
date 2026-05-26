import * as fs from "node:fs";
import * as path from "node:path";
import { SCHEMAS_DIR, ROOT } from "../paths";
import type { DraftTemplate } from "./types";

export const TEMPLATES_DIR = path.join(ROOT, "templates");
export const DEFAULT_TEMPLATE_ID = "epd-header";
export const DEFAULT_TEMPLATE_FILE = "epd-header.v1.json";

export function loadTemplate(filename = DEFAULT_TEMPLATE_FILE): DraftTemplate {
  const filePath = path.join(TEMPLATES_DIR, filename);
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as DraftTemplate;
}

export function templateSchemaPath(): string {
  return path.join(SCHEMAS_DIR, "draft_template.json");
}
