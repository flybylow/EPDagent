import type {
  Phase1Data,
  Phase2Data,
  Phase3CompositionData,
  Phase3LcaStudyData,
  Phase3ProductData,
  Phase4LcaProbeData,
  Phase5ScenariosData,
  Phase6RefsData,
  Phase7EpdSectionsData,
} from "../types";
import type { DraftDocument } from "./types";
import { formatDisplayValue } from "./resolve";
import type { TemplateFieldDef } from "./types";
import type {
  ResolvedSectionField,
  SectionAvailability,
  SectionViewDef,
  SectionViewKind,
  SectionViewTemplate,
} from "./section-view-types";
import { phase3LcaStudyHasContent } from "../phase3-lca-study-content";
import { phase2HasCoverContent } from "../extract/phase2-enrich";
import { phase7BlockForSection, phase7HasContent } from "../phase7-epd-sections-content";
import { inferSectionViewDef } from "./section-view-infer";
import type { ResolvedPhase } from "../phases/registry";
import type { SectionNavItem } from "../navigation/sections";

/** Docmap sections use `number`; the synthetic cover row uses `id` __header__. */
export function sectionViewKey(section: Pick<SectionNavItem, "id" | "number">): string {
  return section.id === "__header__" ? "__header__" : section.number;
}

function resolveSectionViewDef(
  template: SectionViewTemplate,
  sectionId: string,
  title: string
): SectionViewDef | null {
  const inferred = inferSectionViewDef(sectionId, title);
  const fromTemplate = template.sections[sectionId];
  if (!fromTemplate) return inferred;
  if (!inferred) return fromTemplate;
  if (fromTemplate.view === "phase6_refs" && inferred.view === "phase7_section") {
    return inferred;
  }
  return fromTemplate;
}

export interface EpdContentContext {
  stem: string;
  draft: DraftDocument | null;
  phase1: Phase1Data | null;
  phase2: Phase2Data | null;
  phase3: Phase3ProductData | null;
  phase3Composition: Phase3CompositionData | null;
  phase3LcaStudy: Phase3LcaStudyData | null;
  phase4Probe: Phase4LcaProbeData | null;
  phase4Probes: Record<string, Phase4LcaProbeData>;
  phase5: Phase5ScenariosData | null;
  phase6: Phase6RefsData | null;
  phase7: Phase7EpdSectionsData | null;
  phases: ResolvedPhase[];
  exportedTableIds: string[];
}

function getByPath(data: EpdContentContext, dotPath: string): unknown {
  const [root, ...rest] = dotPath.split(".");
  const roots: Record<string, unknown> = {
    phase1: data.phase1,
    phase2: data.phase2,
    phase3: data.phase3,
    phase3Composition: data.phase3Composition,
    phase3LcaStudy: data.phase3LcaStudy,
    phase4Probe: data.phase4Probe,
    phase4Probes: data.phase4Probes,
    phase5: data.phase5,
    phase6: data.phase6,
    phase7: data.phase7,
  };
  let current: unknown = roots[root];
  for (const key of rest) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function normalizeFieldValue(raw: unknown): string | number | string[] | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw === "string" || typeof raw === "number") return raw;
  if (Array.isArray(raw) && raw.every((item) => typeof item === "string")) {
    return raw as string[];
  }
  return null;
}

function additionalParagraphForSection(
  study: NonNullable<EpdContentContext["phase3LcaStudy"]>,
  sectionTitle: string
): string | null {
  const t = sectionTitle.toLowerCase();
  for (const para of study.additional_paragraphs ?? []) {
    const p = para.toLowerCase();
    if (/biogenic|carbon model/i.test(t) && /biogenic|carbon content/i.test(p)) {
      return para.trim();
    }
    if (/carbon offset/i.test(t) && /offsetting|offset/i.test(p)) {
      return para.trim();
    }
    if (/variability|uncertainty/i.test(t) && /variability|uncertainty/i.test(p)) {
      return para.trim();
    }
    if (/energy mix/i.test(t) && /energy mix/i.test(p)) {
      return para.trim();
    }
    if (/interpretation/i.test(t) && /interpretation/i.test(p)) {
      return para.trim();
    }
  }
  return null;
}

function subsectionContent(
  data: EpdContentContext,
  sectionId: string | undefined,
  sectionTitle?: string
): string | null {
  const study = data.phase3LcaStudy;
  if (!study) return null;

  if (sectionId && study.subsections?.length) {
    const sub = study.subsections.find((s) => s.number === sectionId);
    const text = sub?.content?.trim();
    if (text) return text;
  }
  if (sectionTitle) {
    const key = sectionTitle.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 40);
    const sub = study.subsections?.find((s) => {
      const st = (s.title ?? "").toLowerCase();
      return st.includes(key.slice(0, 18)) || key.includes(st.slice(0, 18));
    });
    if (sub?.content?.trim()) return sub.content.trim();

    const fromAdditional = additionalParagraphForSection(study, sectionTitle);
    if (fromAdditional) return fromAdditional;
  }
  return null;
}

function resolveField(
  data: EpdContentContext,
  field: TemplateFieldDef,
  sectionId?: string,
  sectionTitle?: string
): ResolvedSectionField {
  let raw: string | number | string[] | null;
  if (field.path === "phase3LcaStudy._subsection") {
    raw = subsectionContent(data, sectionId, sectionTitle);
  } else {
    raw = normalizeFieldValue(getByPath(data, field.path));
  }
  if ((raw === null || raw === "") && field.fallbackPath) {
    raw = normalizeFieldValue(getByPath(data, field.fallbackPath));
  }
  if (
    (raw === null || raw === "") &&
    sectionId &&
    field.path.startsWith("phase3LcaStudy.") &&
    field.path !== "phase3LcaStudy._subsection"
  ) {
    raw = subsectionContent(data, sectionId, sectionTitle);
  }
  const format = field.format ?? "text";
  let displayValue: string;
  if (format === "years") {
    displayValue = raw != null && raw !== "" ? `${raw} years` : "—";
  } else {
    displayValue = formatDisplayValue(raw, format, field.enumLabels);
  }
  const empty =
    raw === null || raw === "" || (Array.isArray(raw) && raw.length === 0);
  return {
    id: field.id ?? field.path.replace(/\./g, "_"),
    label: field.label,
    path: field.path,
    displayValue,
    empty,
  };
}

function tableForPhase(
  phases: ResolvedPhase[],
  phaseId: string,
  tableId?: string
): ResolvedPhase["tables"][number] | null {
  const phase = phases.find((p) => p.id === phaseId);
  if (!phase?.tables.length) return null;
  if (tableId) return phase.tables.find((t) => t.id === tableId) ?? null;
  return phase.tables[0] ?? null;
}

function viewHasContent(data: EpdContentContext, view: SectionViewKind, tableId?: string): {
  extracted: boolean;
  visual: boolean;
} {
  switch (view) {
    case "draft":
      return {
        extracted: !!data.draft || phase2HasCoverContent(data.phase2),
        visual: false,
      };
    case "phase3_composition":
      return {
        extracted: (data.phase3Composition?.components.length ?? 0) > 0,
        visual: !!tableForPhase(data.phases, "phase3_composition", tableId),
      };
    case "phase3_technical":
      return {
        extracted: (data.phase3?.technical_properties?.length ?? 0) > 0,
        visual: !!tableForPhase(data.phases, "phase3_product", tableId),
      };
    case "phase3_lca_study":
      return {
        extracted: phase3LcaStudyHasContent(data.phase3LcaStudy),
        visual: false,
      };
    case "phase4_lca": {
      const probe =
        (tableId && data.phase4Probes[tableId]) ??
        (tableId === "lca_impacts" ? data.phase4Probe : null);
      const hasProbe = !!probe;
      const table = tableForPhase(data.phases, "phase4_lca", tableId);
      return { extracted: hasProbe, visual: !!table };
    }
    case "phase4_lca_intro": {
      const probe = tableId ? data.phase4Probes[tableId] : null;
      const text = probe?.introductory_text?.trim() ?? "";
      return { extracted: text.length > 0, visual: false };
    }
    case "phase5_scenarios":
      return { extracted: (data.phase5?.scenarios.length ?? 0) > 0, visual: false };
    case "phase5_scenario":
      return { extracted: false, visual: false };
    case "phase7_section":
      return { extracted: phase7HasContent(data.phase7), visual: false };
    case "phase6_refs":
      return {
        extracted:
          (data.phase6?.bibliography.length ?? 0) > 0 ||
          (data.phase6?.additional_information?.length ?? 0) > 0,
        visual: false,
      };
    default:
      return { extracted: false, visual: false };
  }
}

function evaluateSectionView(
  data: EpdContentContext,
  view: SectionViewDef | null,
  sectionId: string,
  sectionTitle: string
): Pick<
  SectionAvailability,
  "hasExtractedContent" | "hasVisualExport" | "pendingMessage" | "fields"
> {
  if (!view) {
    return {
      hasExtractedContent: false,
      hasVisualExport: false,
      pendingMessage: "No template mapping for this section yet.",
      fields: [],
    };
  }

  const lcaStudyPending =
    view.fields?.some((f) => f.path.startsWith("phase3LcaStudy.")) ||
    view.view === "phase3_lca_study";
  const phase2Pending = view.fields?.some((f) => f.path.startsWith("phase2."));
  if (view.view === "phase5_scenario") {
    const scenario = data.phase5?.scenarios.find((s) => s.number === sectionId);
    const text = scenario?.description?.trim() ?? "";
    const fields: ResolvedSectionField[] = text
      ? [
          {
            id: sectionId.replace(/\./g, "_"),
            label: scenario?.title ?? sectionTitle,
            path: "phase5.scenario",
            displayValue: text,
            empty: false,
          },
        ]
      : [];
    return {
      hasExtractedContent: fields.length > 0,
      hasVisualExport: false,
      pendingMessage: fields.length
        ? null
        : "No scenario text extracted for this subsection. Run npm run phase5.",
      fields,
    };
  }

  if (view.view === "phase4_lca_intro") {
    const probe = view.tableId ? data.phase4Probes[view.tableId] : null;
    const text = probe?.introductory_text?.trim() ?? "";
    const fields: ResolvedSectionField[] = text
      ? [
          {
            id: sectionId.replace(/\./g, "_"),
            label: sectionTitle,
            path: "phase4Probes.introductory_text",
            displayValue: text,
            empty: false,
          },
        ]
      : [];
    return {
      hasExtractedContent: fields.length > 0,
      hasVisualExport: false,
      pendingMessage: fields.length
        ? null
        : `No explanatory text for this subsection yet. Re-extract with pages 16–17: npm run phase4-probe -- \"…pdf\" --pages 16-17 --force`,
      fields,
    };
  }

  if (view.view === "phase7_section") {
    const block = phase7BlockForSection(data.phase7, sectionId, sectionTitle);
    let text = block?.content?.trim() ?? "";
    if (!text && /application unit/i.test(sectionTitle)) {
      const parts: string[] = [];
      if (data.phase2?.declared_scope?.trim()) parts.push(data.phase2.declared_scope.trim());
      const du = data.phase2?.declared_unit;
      if (du?.value != null && du.unit) {
        parts.push(`Declared unit: ${du.value} ${du.unit}`);
      } else if (du?.unit) {
        parts.push(`Declared unit: ${du.unit}`);
      }
      text = parts.join("\n\n");
    }
    const fields: ResolvedSectionField[] = text
      ? [
          {
            id: sectionId.replace(/\./g, "_"),
            label: block?.title ?? sectionId,
            path: "phase7.block",
            displayValue: text,
            empty: false,
          },
        ]
      : [];
    return {
      hasExtractedContent: fields.length > 0,
      hasVisualExport: false,
      pendingMessage: fields.length
        ? null
        : "No extracted values for this section yet. Run missing steps on the dashboard (phase 7).",
      fields,
    };
  }

  if (view.pendingMessage) {
    return {
      hasExtractedContent: false,
      hasVisualExport: false,
      pendingMessage: view.pendingMessage,
      fields: [],
    };
  }

  if (view.fields?.length) {
    const fields = view.fields.map((f) => resolveField(data, f, sectionId, sectionTitle));
    const hasExtractedContent = fields.some((f) => !f.empty);
    return {
      hasExtractedContent,
      hasVisualExport: false,
      pendingMessage: hasExtractedContent
        ? null
        : lcaStudyPending
          ? "No extracted values for this section yet. Run npm run phase3-lca-study."
          : phase2Pending
            ? "No extracted values for this section yet. Run npm run phase2."
            : "No extracted values for this section yet.",
      fields,
    };
  }

  if (view.view) {
    const { extracted, visual } = viewHasContent(data, view.view, view.tableId);
    return {
      hasExtractedContent: extracted,
      hasVisualExport: visual && !extracted,
      pendingMessage: extracted
        ? null
        : visual
          ? "Structured extraction pending — table PNG export is available."
          : defaultPendingForView(view.view),
      fields: [],
    };
  }

  return {
    hasExtractedContent: false,
    hasVisualExport: false,
    pendingMessage: "No content template for this section.",
    fields: [],
  };
}

function defaultPendingForView(view: SectionViewKind): string {
  switch (view) {
    case "draft":
      return "Header draft not built yet. Run npm run phase2 then npm run drafts.";
    case "phase3_composition":
      return "Composition not extracted yet. Run npm run phase3-composition.";
    case "phase3_technical":
      return "Technical data not extracted yet. Run npm run phase3.";
    case "phase3_lca_study":
      return "LCA study metadata not extracted yet. Run npm run phase3-lca-study.";
    case "phase4_lca":
      return "LCA table not extracted yet. Run npm run phase4-probe.";
    case "phase4_lca_intro":
      return "LCA explanatory text not extracted yet. Run npm run phase4-probe.";
    case "phase5_scenarios":
      return "Scenarios not extracted yet. Run npm run phase5.";
    case "phase6_refs":
      return "References not extracted yet. Run npm run phase6.";
    case "phase7_section":
      return "Not extracted yet. Run missing steps on the dashboard (phase 7).";
    case "phase5_scenario":
      return "Scenario not extracted yet. Run npm run phase5.";
    default:
      return "Not extracted yet for this section.";
  }
}

export function resolveSectionAvailability(
  section: SectionNavItem,
  data: EpdContentContext,
  pdfAvailable: boolean,
  sectionViewTemplate: SectionViewTemplate
): SectionAvailability {
  const key = sectionViewKey(section);
  const view = resolveSectionViewDef(sectionViewTemplate, key, section.title);
  const evaluated = evaluateSectionView(data, view, key, section.title);

  const pdfPage = section.page;
  const hasPdfLink = pdfAvailable && pdfPage != null;

  return {
    sectionId: section.id,
    pdfAvailable,
    pdfPage,
    hasPdfLink,
    ...evaluated,
    view,
  };
}

export function sectionStatusFromAvailability(
  availability: SectionAvailability
): "ready" | "visual_only" | "pending" {
  if (availability.hasExtractedContent) return "ready";
  if (availability.hasVisualExport || availability.hasPdfLink) return "visual_only";
  return "pending";
}
