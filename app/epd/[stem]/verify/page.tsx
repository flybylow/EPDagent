import Link from "next/link";
import { notFound } from "next/navigation";
import { loadDraft, loadEpdRecord, loadVerification } from "@/lib/data";
import { loadTableManifest } from "@/lib/tables/manifest";
import { VerifyWorkspace } from "./VerifyWorkspace";

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ stem: string }>;
}) {
  const { stem: rawStem } = await params;
  const stem = decodeURIComponent(rawStem);
  const record = loadEpdRecord(stem);
  const draft = loadDraft(stem);

  if (!draft) {
    notFound();
  }

  const verification = loadVerification(stem);
  const tableExports = loadTableManifest(stem);

  return (
    <div className="stack-lg">
      <p>
        <Link href={`/epd/${encodeURIComponent(stem)}`}>← {draft.title}</Link>
      </p>

      <VerifyWorkspace
        stem={stem}
        draft={draft}
        pdfAvailable={!!record.pdfPath}
        initialVerification={verification}
        tableExports={tableExports}
      />
    </div>
  );
}
