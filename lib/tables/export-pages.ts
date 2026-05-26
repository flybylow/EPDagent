import { pdf } from "pdf-to-img";
import * as fs from "node:fs";
import * as path from "node:path";
import { TABLE_EXPORTS_DIR, writeTableManifest } from "./manifest";
import type { TableExportDef, TableExportManifest } from "./types";

/** CLI-only: rasterize PDF pages. Do not import from Next.js app routes. */
export async function exportTablePages(
  pdfPath: string,
  stem: string,
  tables: TableExportDef[],
  options: { scale?: number } = {}
): Promise<TableExportManifest> {
  const scale = options.scale ?? 2;
  const outDir = path.join(TABLE_EXPORTS_DIR, stem);
  fs.mkdirSync(outDir, { recursive: true });

  const neededPages = [...new Set(tables.map((t) => t.page))].sort((a, b) => a - b);
  const maxPage = neededPages[neededPages.length - 1];
  const pageCache = new Map<number, Buffer>();

  const doc = await pdf(pdfPath, { scale });
  let current = 0;
  for await (const image of doc) {
    current += 1;
    if (neededPages.includes(current)) {
      pageCache.set(current, image);
    }
    if (current >= maxPage) break;
  }

  const exported: TableExportManifest["tables"] = [];
  for (const table of tables) {
    const image = pageCache.get(table.page);
    if (!image) {
      throw new Error(`Page ${table.page} not found in PDF (${path.basename(pdfPath)})`);
    }
    const filename = `${table.id}.page-${table.page}.png`;
    const imagePath = path.join(outDir, filename);
    fs.writeFileSync(imagePath, image);
    exported.push({
      ...table,
      image: path.relative(process.cwd(), imagePath),
      imageBytes: image.length,
    });
  }

  const manifest: TableExportManifest = {
    stem,
    pdfFilename: path.basename(pdfPath),
    exportedAt: new Date().toISOString(),
    tables: exported,
  };

  writeTableManifest(manifest);
  return manifest;
}
