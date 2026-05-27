"use client";

import { Suspense } from "react";
import { EpdCorpusPicker } from "@/app/components/EpdCorpusPicker";
import type { CorpusPickerItem } from "@/lib/corpus/picker-item";

function PickerFallback() {
  return (
    <div className="epd-corpus-picker panel" aria-hidden="true">
      <p className="hint">Loading corpus…</p>
    </div>
  );
}

export function EpdWorkspaceLayout({
  corpusItems,
  activeStem,
  children,
}: {
  corpusItems: CorpusPickerItem[];
  activeStem: string;
  children: React.ReactNode;
}) {
  return (
    <div className="epd-workspace-layout">
      <Suspense fallback={<PickerFallback />}>
        <EpdCorpusPicker items={corpusItems} activeStem={activeStem} />
      </Suspense>
      <div className="epd-workspace-main">{children}</div>
    </div>
  );
}
