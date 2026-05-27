import * as fs from "node:fs";
import * as path from "node:path";
import { getReferenceByStem, referenceCompareDir } from "../reference";
import { TEMPLATES_DIR } from "./load";
import type { SectionViewDef, SectionViewTemplate } from "./section-view-types";

const BASE_TEMPLATE = path.join(TEMPLATES_DIR, "epd-section-view.v1.json");

export function loadSectionViewTemplate(stem: string): SectionViewTemplate {
  const base = JSON.parse(fs.readFileSync(BASE_TEMPLATE, "utf-8")) as SectionViewTemplate;
  const ref = getReferenceByStem(stem);
  if (!ref) return base;

  const overridePath = path.join(referenceCompareDir(ref.id), "section-view.json");
  if (!fs.existsSync(overridePath)) return base;

  const override = JSON.parse(fs.readFileSync(overridePath, "utf-8")) as {
    sections?: Record<string, SectionViewDef>;
  };

  return {
    ...base,
    sections: { ...base.sections, ...override.sections },
  };
}

export function sectionViewForId(
  template: SectionViewTemplate,
  sectionId: string
): SectionViewDef | null {
  return template.sections[sectionId] ?? null;
}
