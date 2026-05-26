import * as fs from "node:fs";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

async function main() {
  const path = process.argv[2];
  if (!path) {
    console.error("Usage: find-table-pages.ts <pdf>");
    process.exit(1);
  }
  const data = new Uint8Array(fs.readFileSync(path));
  const doc = await pdfjs.getDocument({ data, disableFontFace: true }).promise;
  const needles = [
    "POTENTIAL ENVIRONMENTAL",
    "Composition and content",
    "TECHNICAL DATA",
    "Components",
  ];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((it) => ("str" in it ? it.str : "")).join(" ");
    for (const needle of needles) {
      if (text.includes(needle)) console.log(`page ${i}: ${needle}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
