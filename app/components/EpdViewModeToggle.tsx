"use client";

import type { EpdViewMode } from "@/lib/navigation/sections";

const MODES: { id: EpdViewMode; label: string }[] = [
  { id: "compare", label: "Compare" },
  { id: "pdf", label: "PDF" },
  { id: "content", label: "Content" },
];

export function EpdViewModeToggle({
  mode,
  onChange,
}: {
  mode: EpdViewMode;
  onChange: (mode: EpdViewMode) => void;
}) {
  return (
    <div className="epd-view-toggle" role="tablist" aria-label="View mode">
      {MODES.map((m) => (
        <button
          key={m.id}
          type="button"
          role="tab"
          aria-selected={mode === m.id}
          className={`epd-view-toggle-btn${mode === m.id ? " is-active" : ""}`}
          onClick={() => onChange(m.id)}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
