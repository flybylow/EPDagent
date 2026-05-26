import * as fs from "node:fs";
import * as path from "node:path";
import { buildDraft } from "./build";
import { loadTemplate } from "./load";
import { renderDraftHtml } from "./render-html";
import type { DraftDocument, DraftManifest, MergedPhaseData } from "./types";
import { DRAFTS_DIR } from "../paths";

export function draftDirForStem(stem: string): string {
  return path.join(DRAFTS_DIR, stem);
}

export function writeDraftOutputs(stem: string, data: MergedPhaseData, templateFile?: string): DraftDocument {
  const template = loadTemplate(templateFile);
  const draft = buildDraft(stem, data, template);
  const dir = draftDirForStem(stem);

  fs.mkdirSync(dir, { recursive: true });

  const draftPath = path.join(dir, "draft.json");
  const htmlPath = path.join(dir, "draft.html");
  const manifestPath = path.join(dir, "manifest.json");

  fs.writeFileSync(draftPath, JSON.stringify(draft, null, 2));
  fs.writeFileSync(htmlPath, renderDraftHtml(draft));

  const manifest: DraftManifest = {
    stem,
    templateId: template.id,
    templateVersion: template.version,
    generatedAt: draft.generatedAt,
    files: {
      draft: path.relative(process.cwd(), draftPath),
      html: path.relative(process.cwd(), htmlPath),
    },
  };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  return draft;
}

export { buildDraft, loadTemplate, renderDraftHtml };
