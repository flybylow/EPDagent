import * as fs from "node:fs";
import * as path from "node:path";
import { pdfPathForStem } from "../data";
import { pdfDir } from "../paths";
import type { Phase7EpdSectionsData } from "../types";
import { runPhase7 } from "./phase7-epd-sections";

/** Build phase 7 narrative blocks from PDF text (+ application unit table). No API. */
export async function refreshPhase7TextForStem(stem: string): Promise<Phase7EpdSectionsData> {
  const pdfPath = pdfPathForStem(stem);
  if (!pdfPath) throw new Error(`PDF not found for ${stem}`);
  return runPhase7(pdfPath, undefined, { force: true });
}

export async function refreshPhase7TextAll(): Promise<{
  ok: number;
  partial: number;
  fail: number;
}> {
  const pdfs = fs
    .readdirSync(pdfDir())
    .filter((f) => f.toLowerCase().endsWith(".pdf"));
  let ok = 0;
  let partial = 0;
  let fail = 0;
  for (const file of pdfs.sort()) {
    const stem = path.basename(file, path.extname(file));
    try {
      const result = await refreshPhase7TextForStem(stem);
      const withContent = result.blocks.filter((b) => b.content?.trim()).length;
      console.log(`OK  ${stem}  blocks=${withContent}`);
      ok++;
    } catch (err) {
      console.log(`FAIL ${stem}  ${(err as Error).message}`);
      fail++;
    }
  }
  return { ok, partial, fail };
}
