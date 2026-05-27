import { EpdCorpusCard } from "@/app/components/EpdCorpusCard";
import { corpusStemKey } from "@/lib/stems/corpus-dedupe";
import type { EpdRecord } from "@/lib/types";

export function EpdCorpusList({
  records,
  extractEnabled = true,
}: {
  records: EpdRecord[];
  extractEnabled?: boolean;
}) {
  return (
    <div className="stack-md">
      {records.length === 0 ? (
        <div className="empty-state">
          <p>No EPDs in the corpus yet.</p>
        </div>
      ) : (
        <ul className="epd-list">
          {records.map((record) => (
            <EpdCorpusCard
              key={corpusStemKey(record.stem)}
              record={record}
              extractEnabled={extractEnabled}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
