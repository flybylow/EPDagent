import { EpdCorpusList } from "@/app/components/EpdCorpusList";
import { listEpdRecords } from "@/lib/data";

export default function HomePage() {
  const records = listEpdRecords();

  return (
    <div className="stack-lg">
      <h1>EPD corpus</h1>
      <p className="hint">
        Select an EPD to open the workspace — corpus strip on top, section tree and PDF below.
      </p>
      <EpdCorpusList records={records} />
    </div>
  );
}
