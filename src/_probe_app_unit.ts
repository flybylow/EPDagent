import { parseApplicationUnitFromPdf } from "../lib/extract/application-unit-parse";

const pdf =
  process.argv[2] ??
  "data/EPD/B-EPD-LAMBDA 35 NAKED-Ursa-026.0184.001-EN-signed.pdf";
const pages = process.argv[3] ?? "20";

parseApplicationUnitFromPdf(pdf, pages).then((r) => {
  if (!r) {
    console.log("parse failed");
    process.exit(1);
  }
  console.log(r.rows.length, "rows");
  console.log(r.summaryText);
});
