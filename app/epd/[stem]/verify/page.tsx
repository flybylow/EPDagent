import Link from "next/link";
import { notFound } from "next/navigation";
import { EpdCompareWorkspace } from "@/app/components/EpdCompareWorkspace";
import { loadEpdRecord, loadVerification } from "@/lib/data";
import { resolveEpdPhases } from "@/lib/phases/registry";

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ stem: string }>;
}) {
  const { stem: rawStem } = await params;
  const stem = decodeURIComponent(rawStem);
  const record = loadEpdRecord(stem);
  const registry = resolveEpdPhases(stem);

  if (!registry.draft) {
    notFound();
  }

  const verification = loadVerification(stem);

  return (
    <div className="stack-lg">
      <p>
        <Link href={`/epd/${encodeURIComponent(stem)}`}>
          ← {registry.draft.title}
        </Link>
      </p>

      <EpdCompareWorkspace
        registry={registry}
        pdfAvailable={!!record.pdfPath}
        initialVerification={verification}
        showVerification
      />
    </div>
  );
}
