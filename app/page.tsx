import { EpdCorpusList } from "@/app/components/EpdCorpusList";
import { listEpdDashboardRecords } from "@/lib/data";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const records = listEpdDashboardRecords();

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
