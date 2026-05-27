import * as fs from "node:fs";
import * as path from "node:path";
import { safeReadJson } from "../fs-safe";
import { getReferenceByStem, referenceCompareDir } from "../reference";
import { TEMPLATES_DIR } from "./load";
import type { SectionViewDef, SectionViewTemplate } from "./section-view-types";
import baseSectionViewTemplate from "../../templates/epd-section-view.v1.json";

const BASE_TEMPLATE = path.join(TEMPLATES_DIR, "epd-section-view.v1.json");

const EMPTY_TEMPLATE: SectionViewTemplate = {
  id: "epd-section-view",
  version: "1",
  title: "EPD sections",
  sections: {},
};

function loadBaseSectionViewTemplate(): SectionViewTemplate {
  return (
    safeReadJson<SectionViewTemplate>(BASE_TEMPLATE) ??
    (baseSectionViewTemplate as SectionViewTemplate)
  );
}

export function loadSectionViewTemplate(stem: string): SectionViewTemplate {
  const base = loadBaseSectionViewTemplate();
  const ref = getReferenceByStem(stem);
  if (!ref) return base;

  const overridePath = path.join(referenceCompareDir(ref.id), "section-view.json");
  if (!fs.existsSync(overridePath)) return base;

  const override = safeReadJson<{
    sections?: Record<string, SectionViewDef>;
  }>(overridePath);
  if (!override?.sections) return base;

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
