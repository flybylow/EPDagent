import { EpdCorpusList } from "@/app/components/EpdCorpusList";
import { getPdfFolderInfo, listEpdRecords } from "@/lib/data";

export default function HomePage() {
  const records = listEpdRecords();
  const pdfFolder = getPdfFolderInfo();

  return (
    <div className="stack-lg">
      <section>
        <h1>EPD corpus</h1>
        <p className="lede">
          EPD PDFs in <code>data/EPD/</code>. Open any EPD to compare the source PDF with the
          formatted draft side by side.
        </p>
      </section>

      <EpdCorpusList
        records={records}
        pdfFolderPath={pdfFolder.path}
        pdfCount={pdfFolder.count}
        pdfFolderIsDefault={pdfFolder.isDefault}
      />
    </div>
  );
}
