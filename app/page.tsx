import { EpdCorpusList } from "@/app/components/EpdCorpusList";
import { isServeOnlyDeploy } from "@/lib/deploy/serve-only";
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
      {isServeOnlyDeploy() ? (
        <p className="hint deploy-readonly-banner">
          Published read-only on this host — phase lights show committed outputs; extract locally
          to refresh data.
        </p>
      ) : null}
      <EpdCorpusList records={records} extractEnabled={!isServeOnlyDeploy()} />
    </div>
  );
}
