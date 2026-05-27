import Anthropic from "@anthropic-ai/sdk";
import { createMessageWithRetry } from "../anthropic/create-message";
import * as fs from "node:fs";
import * as path from "node:path";
import { assertApiPayloadWithinBudget, assertPdfWithinBudget, pdfSha256 } from "../anthropic/guard";
import { phase7BlockForSection } from "../phase7-epd-sections-content";
import {
  phase7TargetSections,
  phase7TargetsPromptList,
  phase7TargetsSatisfied,
  type Phase7TargetSection,
} from "./phase7-targets";
import { parseApplicationUnitFromPdf } from "./application-unit-parse";
import { extractPhase7BlocksFromPdfText } from "./phase7-text-parse";
import {
  mergePageSpecs,
  pagesFromDocmapSection,
  pagesFromDocmapTitle,
} from "./phase-page-spec";
import { loadDocmapForStem } from "../phases/registry";
import { resolvePhase7PageSpec, widenPhase7PageSpec } from "./phase7-pages";
import { slicePdfByPageSpec } from "../pdf/pages";
import { PHASE_DIRS, SCHEMAS_DIR } from "../paths";
import type { EpdSectionBlock, Phase7EpdSectionsData } from "../types";
import { loadPhase7 } from "../data";
import { ensureJsonArray } from "./normalize";

const MODEL = "claude-sonnet-4-5";

const schema = JSON.parse(
  fs.readFileSync(path.join(SCHEMAS_DIR, "phase7_epd_sections.json"), "utf-8")
);

function blockKey(block: EpdSectionBlock): string {
  return (block.number?.trim() || block.title?.trim() || "").toLowerCase();
}

function mergePhase7Blocks(
  previous: EpdSectionBlock[],
  incoming: EpdSectionBlock[]
): EpdSectionBlock[] {
  const merged = new Map<string, EpdSectionBlock>();
  for (const block of previous) {
    if (!block.content?.trim()) continue;
    const key = blockKey(block);
    if (key) merged.set(key, block);
  }
  for (const block of incoming) {
    if (!block.content?.trim()) continue;
    const key = blockKey(block);
    if (key) merged.set(key, block);
  }
  return [...merged.values()];
}

function normalizePhase7Blocks(raw: unknown): EpdSectionBlock[] {
  const rows = ensureJsonArray(raw as EpdSectionBlock[] | string | null | undefined);
  return rows.filter(
    (b): b is EpdSectionBlock =>
      !!b &&
      typeof b === "object" &&
      typeof (b as EpdSectionBlock).content === "string" &&
      (b as EpdSectionBlock).content!.trim().length > 0
  );
}

function buildSystemPrompt(targets: ReturnType<typeof phase7TargetSections>): string {
  const list = phase7TargetsPromptList(targets);
  return `You are an extractor for Environmental Product Declarations (EPDs) following EN 15804.

Your task: read the attached EPD PDF excerpt and extract the narrative sections listed below (section numbers vary by publisher).

Extract these sections when present in the excerpt:
${list}

Rules:
- blocks: one entry per listed section or subsection with its exact number (e.g. "11.1", "15"), title, and full content verbatim.
- Copy text verbatim. Preserve bullet lists as plain text.
- If a listed section is not in the excerpt, omit it from blocks (do not invent).
- Section 13 may be titled "LCA interpretation" — extract it as narrative text, not as tables.
- Do not include scenario tables (section 10), LCA result tables, or bibliography / references.
- Application unit: if a multi-column product table is present, omit it (parsed separately from the PDF). Keep any introductory paragraph.`;
}

function resolveApplicationUnitPageSpec(stem: string): string {
  return (
    pagesFromDocmapTitle(stem, /application unit/i) ??
    mergePageSpecs(
      pagesFromDocmapSection(stem, "14"),
      pagesFromDocmapSection(stem, "13"),
      pagesFromDocmapSection(stem, "15")
    ) ??
    ""
  );
}

function applicationUnitSectionMeta(stem: string): { number: string; title: string } {
  const entry = loadDocmapForStem(stem)?.flat_entries.find((e) =>
    /application unit/i.test(e.title)
  );
  const number = entry?.number?.replace(/\s+/g, "").replace(/\.$/, "") ?? "14";
  return { number, title: entry?.title ?? "APPLICATION UNIT" };
}

async function mergeApplicationUnitParser(
  pdfPath: string,
  stem: string,
  blocks: EpdSectionBlock[]
): Promise<EpdSectionBlock[]> {
  const pageSpec = resolveApplicationUnitPageSpec(stem);
  if (!pageSpec.trim()) return blocks;
  const parsed = await parseApplicationUnitFromPdf(pdfPath, pageSpec);
  if (!parsed?.rows.length) return blocks;

  const { number, title } = applicationUnitSectionMeta(stem);
  const parserBlock: EpdSectionBlock = {
    number,
    title,
    content: parsed.summaryText,
  };
  const drop = new Set<string>([blockKey(parserBlock), "application unit"]);
  return [
    ...blocks.filter((b) => !drop.has(blockKey(b)) && !/application unit/i.test(b.title ?? "")),
    parserBlock,
  ];
}

function missingPhase7Targets(
  stem: string,
  data: Phase7EpdSectionsData,
  targets: ReturnType<typeof phase7TargetSections>
): Phase7TargetSection[] {
  return targets.filter(
    (t) => !phase7BlockForSection(data, t.number, t.title)?.content?.trim()
  );
}

function pageSpecForMissingTargets(
  stem: string,
  missing: Phase7TargetSection[]
): string | null {
  const specs = missing
    .map((t) => pagesFromDocmapSection(stem, t.number))
    .filter((s): s is string => Boolean(s?.trim()));
  const merged = mergePageSpecs(...specs);
  return merged.trim() ? merged : null;
}

async function extractPhase7Slice(
  pdfPath: string,
  stem: string,
  apiKey: string,
  targets: ReturnType<typeof phase7TargetSections>,
  pageSpec: string,
  previous: EpdSectionBlock[]
): Promise<{
  blocks: EpdSectionBlock[];
  slice: Awaited<ReturnType<typeof slicePdfByPageSpec>>;
  usage: { input_tokens: number; output_tokens: number };
}> {
  const slice = await slicePdfByPageSpec(pdfPath, pageSpec, { stem, export: true });
  const systemPrompt = buildSystemPrompt(targets);
  assertApiPayloadWithinBudget(
    slice.byteSize,
    `Phase 7 slice (pages ${slice.pageRange})`
  );

  const client = new Anthropic({ apiKey });
  const response = await createMessageWithRetry(client, {
    model: MODEL,
    max_tokens: 8192,
    system: systemPrompt,
    tools: [
      {
        name: "record_epd_sections_11_14",
        description: "Record extracted narrative EPD sections. Call exactly once.",
        input_schema: schema as Anthropic.Tool.InputSchema,
      },
    ],
    tool_choice: { type: "tool", name: "record_epd_sections_11_14" },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: slice.bytes.toString("base64"),
            },
          },
          {
            type: "text",
            text: `Extract these narrative sections from this excerpt (pages ${slice.pages.join(", ")} of ${slice.totalPages}):\n${phase7TargetsPromptList(targets)}\n\nCall record_epd_sections_11_14.`,
          },
        ],
      },
    ],
  }, { label: "phase7" });

  const toolUse = response.content.find(
    (block) => block.type === "tool_use" && block.name === "record_epd_sections_11_14"
  );

  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error(`No tool_use block in response. Stop reason: ${response.stop_reason}`);
  }

  const raw = toolUse.input as { blocks?: unknown };
  const extracted = normalizePhase7Blocks(raw.blocks);
  const blocks = mergePhase7Blocks(previous, extracted);

  if (!extracted.length && targets.length > 0) {
    console.warn(
      `[phase7] ${stem}: model returned no new blocks (pages ${slice.pageRange}); ${blocks.length} block(s) kept from cache.`
    );
  }

  return {
    blocks,
    slice,
    usage: {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    },
  };
}

export async function runPhase7(
  pdfPath: string,
  apiKey: string | undefined,
  options: { force?: boolean; pageSpec?: string } = {}
): Promise<Phase7EpdSectionsData> {
  const stem = path.basename(pdfPath, path.extname(pdfPath));
  assertPdfWithinBudget(pdfPath);

  const targets = phase7TargetSections(stem);
  const previous = options.force ? [] : (loadPhase7(stem)?.blocks ?? []);
  let pageSpec = options.pageSpec?.trim() || resolvePhase7PageSpec(stem);
  let totalInput = 0;
  let totalOutput = 0;

  const key = apiKey?.trim();
  const textBlocks = await extractPhase7BlocksFromPdfText(pdfPath, stem, targets);
  let blocks = mergePhase7Blocks(previous, textBlocks);

  let slice: Awaited<ReturnType<typeof slicePdfByPageSpec>> | null = null;
  if (key) {
    const apiRun = await extractPhase7Slice(
      pdfPath,
      stem,
      key,
      targets,
      pageSpec,
      blocks
    );
    blocks = mergePhase7Blocks(blocks, apiRun.blocks);
    slice = apiRun.slice;
    totalInput += apiRun.usage.input_tokens;
    totalOutput += apiRun.usage.output_tokens;
  }

  blocks = await mergeApplicationUnitParser(pdfPath, stem, blocks);

  const pagesUsed =
    slice?.pageRange ?? (pageSpec || resolvePhase7PageSpec(stem) || "(pdf-text)");

  let draft: Phase7EpdSectionsData = {
    blocks,
    _source: {
      pdf_filename: path.basename(pdfPath),
      pdf_sha256: pdfSha256(pdfPath),
      api_pages: resolvePhase7PageSpec(stem) || pageSpec || "(last pages)",
      api_pages_slice: pageSpec || "(last pages)",
      api_pages_resolved: pagesUsed,
      extracted_by: key ? "claude-api+pdf-text-parser" : "pdf-text-parser",
      extracted_at: new Date().toISOString(),
      model: key ? MODEL : null,
      input_tokens: totalInput,
      output_tokens: totalOutput,
    },
  };

  if (!phase7TargetsSatisfied(stem, draft) && key && slice) {
    const wideSpec = widenPhase7PageSpec(pageSpec, 3, slice.totalPages);
    if (wideSpec !== pageSpec) {
      console.warn(`[phase7] ${stem}: retrying with wider pages ${wideSpec}`);
      pageSpec = wideSpec;
      const retry = await extractPhase7Slice(
        pdfPath,
        stem,
        key,
        targets,
        pageSpec,
        blocks
      );
      blocks = mergePhase7Blocks(blocks, retry.blocks);
      blocks = await mergeApplicationUnitParser(pdfPath, stem, blocks);
      slice = retry.slice;
      totalInput += retry.usage.input_tokens;
      totalOutput += retry.usage.output_tokens;
      draft = {
        blocks,
        _source: {
          ...draft._source,
          api_pages_slice: pageSpec,
          api_pages_resolved: slice.pageRange,
          input_tokens: totalInput,
          output_tokens: totalOutput,
        },
      };
    }
  }

  let stillMissing = missingPhase7Targets(stem, draft, targets);
  if (stillMissing.length && key) {
    const focusSpec = pageSpecForMissingTargets(stem, stillMissing);
    if (focusSpec && focusSpec !== pageSpec) {
      console.warn(
        `[phase7] ${stem}: retrying ${stillMissing.length} missing section(s) on pages ${focusSpec}`
      );
      const focus = await extractPhase7Slice(
        pdfPath,
        stem,
        key,
        stillMissing,
        focusSpec,
        blocks
      );
      blocks = mergePhase7Blocks(blocks, focus.blocks);
      blocks = await mergeApplicationUnitParser(pdfPath, stem, blocks);
      slice = focus.slice;
      totalInput += focus.usage.input_tokens;
      totalOutput += focus.usage.output_tokens;
      draft = {
        blocks,
        _source: {
          ...draft._source,
          api_pages_slice: mergePageSpecs(pageSpec, focusSpec),
          api_pages_resolved: slice.pageRange,
          input_tokens: totalInput,
          output_tokens: totalOutput,
        },
      };
      stillMissing = missingPhase7Targets(stem, draft, targets);
    }
  }

  if (stillMissing.length) {
    const labels = stillMissing.map((t) => `${t.number} ${t.title}`);
    const hintPages = pageSpecForMissingTargets(stem, stillMissing);
    const msg =
      `Phase 7 incomplete (${stillMissing.length}/${targets.length} sections): ${labels.join("; ")}. ` +
      `Pages used: ${pagesUsed}.` +
      (hintPages ? ` Try: npm run phase7 -- "<pdf>" --force --pages ${hintPages}` : "") +
      (!key ? " Or set ANTHROPIC_API_KEY for full narrative extraction." : "");
    if (key) {
      throw new Error(msg);
    }
    console.warn(`[phase7] ${stem}: ${msg}`);
  }

  const result: Phase7EpdSectionsData = {
    blocks: draft.blocks,
    _source: {
      ...draft._source,
      ...(slice?.droppedPages?.length
        ? { api_pages_dropped: slice.droppedPages.join(",") }
        : {}),
      ...(slice
        ? {
            api_pdf_bytes: slice.byteSize,
            api_pdf_sha256: slice.sha256,
            api_pdf_slice: slice.exportPath
              ? path.relative(process.cwd(), slice.exportPath)
              : null,
          }
        : {}),
    },
  };

  fs.mkdirSync(PHASE_DIRS.phase7, { recursive: true });
  fs.writeFileSync(path.join(PHASE_DIRS.phase7, `${stem}.json`), JSON.stringify(result, null, 2));
  return result;
}
