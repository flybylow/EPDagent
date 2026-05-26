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
          EPD PDFs in <code>data/EPD/</code>. The ETEX <em>natura ea</em> file is the canonical
          reference for compare — tag <strong>reference · compare here</strong>.
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
