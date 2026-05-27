import "dotenv/config";
import { refreshPhase7TextForStem, refreshPhase7TextAll } from "../lib/extract/refresh-phase7-text";
import path from "node:path";

const arg = process.argv[2];
if (!arg || arg === "--all") {
  const { ok, fail } = await refreshPhase7TextAll();
  console.log(`\n${ok} ok, ${fail} failed`);
  if (fail) process.exitCode = 1;
} else {
  const pdfPath = path.resolve(arg);
  const stem = path.basename(pdfPath, path.extname(pdfPath));
  const result = await refreshPhase7TextForStem(stem);
  for (const b of result.blocks) {
    console.log(`${b.number ?? "—"}  ${(b.title ?? "").slice(0, 40)}  ${(b.content ?? "").length} chars`);
  }
}
