import * as fs from "node:fs";
import * as path from "node:path";
import { PHASE_DIRS } from "../paths";
import { parseFilename } from "../phase1/parse";
import type { Phase1Data } from "../types";

export function runPhase1(pdfPath: string): Phase1Data {
  const filename = path.basename(pdfPath);
  const stem = path.basename(pdfPath, path.extname(pdfPath));
  const result: Phase1Data = {
    ...parseFilename(filename),
    _source: {
      pdf_filename: filename,
      extracted_by: "filename-regex",
      extracted_at: new Date().toISOString(),
    },
  };

  fs.mkdirSync(PHASE_DIRS.phase1, { recursive: true });
  fs.writeFileSync(path.join(PHASE_DIRS.phase1, `${stem}.json`), JSON.stringify(result, null, 2));
  return result;
}
