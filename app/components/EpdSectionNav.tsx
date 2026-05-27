"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SectionStatusBadges } from "@/app/components/SectionStatusBadges";
import type { SectionNavItem } from "@/lib/navigation/sections";
import {
  isGapNavItem,
  sectionNavCoverageStats,
} from "@/lib/navigation/coverage-stats";
import {
  ancestorIdsForActive,
  navIndexLabel,
  parentIdsWithChildren,
  sectionHash,
} from "@/lib/navigation/sections";

function NavBranch({
  items,
  activeId,
  gapsOnly,
  collapsedIds,
  onItemClick,
  listId,
}: {
  items: SectionNavItem[];
  activeId: string;
  gapsOnly: boolean;
  collapsedIds: Set<string>;
  onItemClick: (item: SectionNavItem) => void;
  listId?: string;
}) {
  return (
    <ul className="epd-nav-tree" id={listId}>
      {items.map((item) => {
        const gap = isGapNavItem(item);
        const dimmed = gapsOnly && !gap;
        const hasChildren = Boolean(item.children?.length);
        const expanded = hasChildren && !collapsedIds.has(item.id);
        const branchId = hasChildren ? `epd-nav-branch-${encodeURIComponent(item.id)}` : undefined;
        const indexLabel = navIndexLabel(item.number);
        const fullNumber = item.number !== "—" ? item.number : null;
        const rowTitle =
          fullNumber && indexLabel && fullNumber !== indexLabel
            ? `§${fullNumber} — ${item.title}`
            : item.title;

        return (
          <li
            key={item.id}
            className={`epd-nav-item${gap ? " is-gap" : ""}${dimmed ? " is-dimmed" : ""}${
              hasChildren ? " has-children" : ""
            }${expanded ? "" : " is-collapsed"}`}
            data-level={item.level}
          >
            <button
              type="button"
              className={`epd-nav-link${item.id === activeId ? " is-active" : ""}${
                hasChildren ? " has-branch" : ""
              }`}
              aria-expanded={hasChildren ? expanded : undefined}
              aria-controls={hasChildren ? branchId : undefined}
              onClick={(e) => {
                onItemClick(item);
                e.currentTarget.focus({ preventScroll: true });
              }}
              title={item.availability.pendingMessage ?? rowTitle}
            >
              <span className="epd-nav-toggle-cell" aria-hidden="true">
                {hasChildren ? <span className="epd-nav-chevron" /> : null}
              </span>
              <span className="epd-nav-number">{indexLabel || "\u00a0"}</span>
              <span className="epd-nav-title">{item.title}</span>
              <SectionStatusBadges availability={item.availability} compact />
            </button>
            {hasChildren && expanded ? (
              <NavBranch
                items={item.children!}
                activeId={activeId}
                gapsOnly={gapsOnly}
                collapsedIds={collapsedIds}
                onItemClick={onItemClick}
                listId={branchId}
              />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function partitionNavItems(items: SectionNavItem[]) {
  const header = items.find((item) => item.id === "__header__") ?? null;
  const toc = items.filter((item) => item.id !== "__header__");
  return { header, toc };
}

export function EpdSectionNav({
  items,
  activeId,
  onSelect,
  initialGapsOnly = false,
  gapsOnly: gapsOnlyProp,
  onGapsOnlyChange,
}: {
  items: SectionNavItem[];
  activeId: string;
  onSelect: (item: SectionNavItem) => void;
  initialGapsOnly?: boolean;
  gapsOnly?: boolean;
  onGapsOnlyChange?: (on: boolean) => void;
}) {
  const { header, toc } = useMemo(() => partitionNavItems(items), [items]);
  const [gapsOnlyInternal, setGapsOnlyInternal] = useState(initialGapsOnly);
  const gapsOnly = gapsOnlyProp ?? gapsOnlyInternal;
  const setGapsOnly = onGapsOnlyChange ?? setGapsOnlyInternal;
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(
    () => new Set(parentIdsWithChildren(items))
  );
  const stats = useMemo(() => sectionNavCoverageStats(items), [items]);
  const navScrollRef = useRef<HTMLDivElement>(null);

  // Expand ancestors of the active row only — do not collapse the whole tree (that jumps scroll).
  useEffect(() => {
    const ancestors = ancestorIdsForActive(items, activeId);
    if (!ancestors.length) return;
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      for (const id of ancestors) next.delete(id);
      return next;
    });
  }, [activeId, items]);

  useEffect(() => {
    const root = navScrollRef.current;
    if (!root) return;
    const frame = requestAnimationFrame(() => {
      root
        .querySelector<HTMLElement>(".epd-nav-link.is-active")
        ?.scrollIntoView({ block: "nearest", inline: "nearest" });
    });
    return () => cancelAnimationFrame(frame);
  }, [activeId]);

  function handleItemClick(item: SectionNavItem) {
    onSelect(item);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", sectionHash(item.id));
    }

    if (!item.children?.length) return;

    setCollapsedIds((prev) => {
      const allParents = parentIdsWithChildren(items);
      const isExpanded = !prev.has(item.id);

      if (isExpanded) {
        const next = new Set(prev);
        next.add(item.id);
        return next;
      }

      const next = new Set(allParents);
      for (const id of ancestorIdsForActive(items, item.id)) {
        next.delete(id);
      }
      next.delete(item.id);
      return next;
    });
  }

  return (
    <aside className="epd-section-nav" aria-label="Document index">
      <div className="epd-nav-head">
        <p className="epd-nav-label">Index</p>
        <p className="epd-nav-stats">
          <span
            className="epd-nav-stat is-data"
            title="Sections with extracted structured data"
          >
            {stats.withData}/{stats.total} sections
          </span>
          {stats.gaps > 0 ? (
            <span className="epd-nav-stat is-gap">{stats.gaps} gaps</span>
          ) : null}
        </p>
      </div>
      {stats.gaps > 0 ? (
        <label className="epd-nav-filter">
          <input
            type="checkbox"
            checked={gapsOnly}
            onChange={(e) => setGapsOnly(e.target.checked)}
          />
          Gaps only
        </label>
      ) : null}
      <p className="epd-nav-legend" aria-hidden="true">
        <SectionStatusBadges
          availability={{
            hasPdfLink: true,
            hasExtractedContent: true,
            hasVisualExport: false,
            pendingMessage: null,
          }}
          compact
        />
        <span className="epd-nav-legend-text">pdf-only · data</span>
      </p>
      <div className="epd-nav-scroll" ref={navScrollRef}>
        {header ? (
          <NavBranch
            items={[header]}
            activeId={activeId}
            gapsOnly={gapsOnly}
            collapsedIds={collapsedIds}
            onItemClick={handleItemClick}
            listId="epd-nav-introduction"
          />
        ) : null}
        {toc.length === 0 ? (
          <p className="hint epd-nav-empty">
            No PDF index yet. Click <strong>Run missing steps</strong> — the{" "}
            <strong>DM</strong> light runs docmap first, then refresh.
          </p>
        ) : (
          <NavBranch
            items={toc}
            activeId={activeId}
            gapsOnly={gapsOnly}
            collapsedIds={collapsedIds}
            onItemClick={handleItemClick}
          />
        )}
      </div>
    </aside>
  );
}
