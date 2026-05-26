import * as fs from "node:fs";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

async function scan(pdfPath: string, maxPages = 25): Promise<void> {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjs.getDocument({ data, disableFontFace: true }).promise;
  console.log(`\n=== ${pdfPath.split("/").pop()} (${doc.numPages} pages) ===`);

  for (let i = 1; i <= Math.min(doc.numPages, maxPages); i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const items = content.items.filter((it) => "str" in it);
    const text = items.map((it) => ("str" in it ? it.str : "")).join(" ");
    if (/contents|table of content|inhoud|sommaire|^index\b/i.test(text)) {
      console.log(`\n--- page ${i} (keyword hit) ---`);
      console.log(text.slice(0, 400).replace(/\s+/g, " "));
    }
  }
}

async function extractLines(pdfPath: string, pageNum: number): Promise<void> {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjs.getDocument({ data, disableFontFace: true }).promise;
  const page = await doc.getPage(pageNum);
  const content = await page.getTextContent();
  const lines = new Map<number, Array<{ x: number; text: string }>>();

  for (const item of content.items) {
    if (!("str" in item) || !item.str.trim()) continue;
    const y = Math.round(item.transform[5]);
    const x = Math.round(item.transform[4]);
    if (!lines.has(y)) lines.set(y, []);
    lines.get(y)!.push({ x, text: item.str.trim() });
  }

  const sorted = [...lines.entries()].sort((a, b) => b[0] - a[0]);
  console.log(`\n=== ${pdfPath.split("/").pop()} page ${pageNum} lines ===`);
  for (const [, parts] of sorted.slice(0, 40)) {
    parts.sort((a, b) => a.x - b.x);
    console.log(parts.map((p) => p.text).join(" | "));
  }
}

async function main(): Promise<void> {
  const rockwool =
    "data/EPD/B-EPD_023.0011.007-02.00.00 Rockwool Rockfit Mono EN - signed.pdf";
  const etex = "data/EPD/B-EPD 21-0135-03-00-00-EN ETEX - natura ea - signed.pdf";

  await scan(rockwool);
  await scan(etex);

  for (const p of [3, 4, 5]) {
    await extractLines(rockwool, p);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
