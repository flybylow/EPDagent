import * as fs from "node:fs";
import * as path from "node:path";
import { parseSystemBoundariesFromPdf } from "../lib/extract/system-boundaries-parse";
import { resolveSystemBoundariesPageSpec } from "../lib/extract/phase3-lca-study-pages";
import { extractPdfPageTextItems } from "../lib/pdf/text-items";

const PDF_DIR = path.join(process.cwd(), "data/EPD");

async function debugPage(pdf: string, page: number): Promise<void> {
  const items = await extractPdfPageTextItems(pdf, page);
  const modules = items.filter((i) => /^(A[1-5]|B[1-7]|C[1-4]|D)$/.test(i.str));
  const marks = items.filter((i) => /☒|☐|✓|✔|^[Xx]$/.test(i.str));
  const horiz = items.filter((i) => Math.abs(i.rotation) < 15);
  const modH = horiz.filter((i) => /^(A[1-5]|B[1-7]|C[1-4]|D)$/.test(i.str));
  console.log(
    `    p${page}: modules=${modules.length} horizModules=${modH.length} marks=${marks.length} chars=${[...new Set(marks.map((m) => m.str))].join("")}`
  );
}

async function main() {
  const pdfs = fs.readdirSync(PDF_DIR).filter((f) => f.endsWith(".pdf"));
  const results: { stem: string; status: string }[] = [];

  for (const file of pdfs.sort()) {
    const stem = path.basename(file, ".pdf");
    const pdf = path.join(PDF_DIR, file);
    const spec = resolveSystemBoundariesPageSpec(stem);
    let r = await parseSystemBoundariesFromPdf(pdf, spec || "8");

    if (!r && spec) {
      const page = Number(spec.split(",")[0]);
      for (const alt of [page - 1, page, page + 1]) {
        if (alt >= 1) {
          r = await parseSystemBoundariesFromPdf(pdf, String(alt));
          if (r) break;
        }
      }
    }

    if (r) {
      console.log(
        `OK  ${stem.slice(0, 55).padEnd(55)} p${r.page} ☒${r.declaredModules.length} ☐${r.notDeclaredModules.length}`
      );
      results.push({ stem, status: "ok" });
    } else {
      console.log(`FAIL ${stem.slice(0, 55).padEnd(55)} pages=${spec || "?"}`);
      const page = spec ? Number(spec.split(",")[0]) : 8;
      await debugPage(pdf, page);
      results.push({ stem, status: "fail" });
    }
  }

  const ok = results.filter((r) => r.status === "ok").length;
  console.log(`\n${ok}/${results.length} parsed`);
  if (ok < results.length) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
