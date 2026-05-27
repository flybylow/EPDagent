import { Phase4LcaProbeView } from "@/app/components/Phase4LcaProbeView";
import { Phase5ScenariosView } from "@/app/components/Phase5ScenariosView";
import { Phase3LcaStudyView } from "@/app/components/Phase3LcaStudyView";
import { Phase6RefsView } from "@/app/components/Phase6RefsView";
import { Phase3CompositionView } from "@/app/components/Phase3CompositionView";
import { DraftDocumentView } from "@/app/components/DraftDocumentView";
import { SectionFieldView } from "@/app/components/SectionFieldView";
import { TableCompareRow } from "@/app/components/TableCompareRow";
import type { EpdPhaseRegistry, ResolvedPhase } from "@/lib/phases/registry";
import type { SectionNavItem } from "@/lib/navigation/sections";
import type { SectionAvailability } from "@/lib/templates/section-view-types";

function tableForSection(
  phase: ResolvedPhase | undefined,
  tableId: string | null | undefined
): ResolvedPhase["tables"][number] | null {
  if (!phase?.tables.length) return null;
  if (tableId) return phase.tables.find((t) => t.id === tableId) ?? null;
  return phase.tables[0] ?? null;
}

export function EpdSectionContent({
  section,
  registry,
  availability,
}: {
  section: SectionNavItem;
  registry: EpdPhaseRegistry;
  availability: SectionAvailability;
}) {
  const view = availability.view;
  const table = view?.tableId
    ? tableForSection(
        registry.phases.find((p) => {
          if (view.view === "phase3_composition") return p.id === "phase3_composition";
          if (view.view === "phase3_technical") return p.id === "phase3_product";
          if (view.view === "phase4_lca") return p.id === "phase4_lca";
          return false;
        }),
        view.tableId
      )
    : null;

  const lcaTableId =
    view?.tableId ??
    (view?.view === "phase4_lca_intro" ? "lca_additional" : null);
  const lcaProbe =
    view?.view === "phase4_lca" && view.tableId
      ? registry.phase4Probes[view.tableId]
      : view?.view === "phase4_lca_intro" && lcaTableId
        ? registry.phase4Probes[lcaTableId]
        : null;
  const lcaCompare =
    view?.view === "phase4_lca" && table && availability.hasVisualExport;

  return (
    <div className="epd-section-content-inner">
      <header className="epd-section-content-head">
        <h2>
          {section.number !== "—" ? `${section.number} · ` : ""}
          {section.title}
        </h2>
      </header>

      {availability.hasExtractedContent && view?.view === "draft" && registry.draft ? (
        <DraftDocumentView draft={registry.draft} />
      ) : null}

      {availability.hasExtractedContent && availability.fields.length > 0 ? (
        <SectionFieldView fields={availability.fields} />
      ) : null}

      {availability.hasExtractedContent && view?.view === "phase3_composition" && registry.phase3Composition ? (
        <Phase3CompositionView data={registry.phase3Composition} />
      ) : null}

      {availability.hasExtractedContent && view?.view === "phase3_technical" && registry.phase3 ? (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Property</th>
                <th>Standard</th>
                <th>Value</th>
                <th>Unit</th>
                <th>Comment</th>
              </tr>
            </thead>
            <tbody>
              {(registry.phase3.technical_properties ?? []).map((row, i) => (
                <tr key={`${row.property}-${i}`}>
                  <td>{row.property ?? "—"}</td>
                  <td>{row.standard ?? "—"}</td>
                  <td>{row.value ?? "—"}</td>
                  <td>{row.unit ?? "—"}</td>
                  <td>{row.comment ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {lcaCompare ? (
        <TableCompareRow stem={registry.stem} table={table} probe={lcaProbe} />
      ) : null}

      {availability.hasExtractedContent &&
      view?.view === "phase4_lca" &&
      lcaProbe &&
      !lcaCompare ? (
        <Phase4LcaProbeView data={lcaProbe} />
      ) : null}

      {availability.hasExtractedContent &&
      view?.view === "phase3_lca_study" &&
      registry.phase3LcaStudy ? (
        <Phase3LcaStudyView data={registry.phase3LcaStudy} />
      ) : null}

      {availability.hasExtractedContent && view?.view === "phase5_scenarios" && registry.phase5 ? (
        <Phase5ScenariosView data={registry.phase5} />
      ) : null}

      {availability.hasExtractedContent && view?.view === "phase6_refs" && registry.phase6 ? (
        <Phase6RefsView data={registry.phase6} />
      ) : null}

      {availability.hasVisualExport &&
      table &&
      view?.view !== "phase4_lca" &&
      view?.view !== "phase4_lca_intro" ? (
        <div className="stack-md">
          <TableCompareRow stem={registry.stem} table={table} />
        </div>
      ) : null}

      {!availability.hasExtractedContent &&
      !availability.hasVisualExport &&
      !(view?.view === "phase4_lca" && table && availability.hasVisualExport) ? (
        <div className="section-empty-state">
          <p>{availability.pendingMessage ?? "Nothing extracted for this section yet."}</p>
        </div>
      ) : null}
    </div>
  );
}
