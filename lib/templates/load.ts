import * as path from "node:path";
import { SCHEMAS_DIR, ROOT } from "../paths";
import type { DraftTemplate } from "./types";
import defaultHeaderTemplate from "./epd-header.v1.json";

export const TEMPLATES_DIR = path.join(ROOT, "templates");
export const DEFAULT_TEMPLATE_ID = "epd-header";
export const DEFAULT_TEMPLATE_FILE = "epd-header.v1.json";

/** Inlined at build time — never read templates/ from disk (breaks on Vercel). */
export function loadTemplate(filename = DEFAULT_TEMPLATE_FILE): DraftTemplate {
  if (filename !== DEFAULT_TEMPLATE_FILE) {
    throw new Error(
      `Unknown template "${filename}". Only ${DEFAULT_TEMPLATE_FILE} is available.`
    );
  }
  return defaultHeaderTemplate as DraftTemplate;
}

export function templateSchemaPath(): string {
  return path.join(SCHEMAS_DIR, "draft_template.json");
}
