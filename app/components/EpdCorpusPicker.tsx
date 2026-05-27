"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { CorpusPickerItem } from "@/lib/corpus/picker-item";

function matchesFilter(item: CorpusPickerItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    item.displayName.toLowerCase().includes(q) ||
    (item.epdNumber?.toLowerCase().includes(q) ?? false) ||
    item.stem.toLowerCase().includes(q)
  );
}

export function EpdCorpusPicker({
  items,
  activeStem,
}: {
  items: CorpusPickerItem[];
  activeStem: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [gapsOnly, setGapsOnly] = useState(false);
  const [pdfOnly, setPdfOnly] = useState(false);
  const scrollerRef = useRef<HTMLUListElement | null>(null);
  const activeRef = useRef<HTMLButtonElement | null>(null);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (pdfOnly && !item.hasPdf) return false;
      if (gapsOnly && item.gaps === 0) return false;
      return matchesFilter(item, query);
    });
  }, [items, query, gapsOnly, pdfOnly]);

  useEffect(() => {
    activeRef.current?.scrollIntoView({
      block: "nearest",
      inline: "center",
      behavior: "smooth",
    });
  }, [activeStem, filtered.length]);

  function selectStem(stem: string) {
    if (stem === activeStem) return;
    const params = new URLSearchParams(searchParams.toString());
    const qs = params.toString();
    router.push(`/epd/${encodeURIComponent(stem)}${qs ? `?${qs}` : ""}`);
  }

  return (
    <div className="epd-corpus-picker panel" aria-label="EPD corpus">
      <div className="epd-corpus-picker-toolbar">
        <div className="epd-corpus-picker-toolbar-start">
          <h2 className="epd-corpus-picker-title">EPDs</h2>
          <span className="hint epd-corpus-picker-count">
            {filtered.length}/{items.length}
          </span>
        </div>
        <input
          type="search"
          className="epd-corpus-picker-search"
          placeholder="Filter name or EPD no…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Filter EPD list"
        />
        <div className="epd-corpus-picker-filters">
          <label className="epd-corpus-picker-filter">
            <input
              type="checkbox"
              checked={pdfOnly}
              onChange={(e) => setPdfOnly(e.target.checked)}
            />
            PDF
          </label>
          <label className="epd-corpus-picker-filter">
            <input
              type="checkbox"
              checked={gapsOnly}
              onChange={(e) => setGapsOnly(e.target.checked)}
            />
            Gaps
          </label>
        </div>
      </div>

      <ul
        ref={scrollerRef}
        className="epd-corpus-picker-list"
        role="listbox"
        aria-label="Select EPD"
        aria-orientation="horizontal"
      >
        {filtered.length === 0 ? (
          <li className="hint epd-corpus-picker-empty">No EPDs match filter</li>
        ) : (
          filtered.map((item) => {
            const active = item.stem === activeStem;
            return (
              <li key={item.stem} role="presentation" className="epd-corpus-picker-li">
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  ref={active ? activeRef : undefined}
                  className={`epd-corpus-picker-item${active ? " is-active" : ""}`}
                  onClick={() => selectStem(item.stem)}
                >
                  <span className="epd-corpus-picker-item-name">{item.displayName}</span>
                  {item.epdNumber ? (
                    <span className="epd-corpus-picker-item-epd">{item.epdNumber}</span>
                  ) : null}
                  <span className="epd-corpus-picker-item-stats">
                    {item.phasesTotal > 0 ? (
                      <span>
                        {item.phasesReady}/{item.phasesTotal} phases
                      </span>
                    ) : null}
                    {item.sectionsTotal > 0 ? (
                      <span>
                        {item.sectionsWithData}/{item.sectionsTotal} sections
                      </span>
                    ) : null}
                    {item.gaps > 0 ? (
                      <span className="epd-corpus-picker-item-gaps">{item.gaps} gaps</span>
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
