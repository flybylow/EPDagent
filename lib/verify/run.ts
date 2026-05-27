import Anthropic from "@anthropic-ai/sdk";
import { createMessageWithRetry } from "../anthropic/create-message";
import * as fs from "node:fs";
import * as path from "node:path";
import type { DraftDocument, FieldVerification, VerificationResult } from "../templates/types";
import { pdfDir, VERIFICATION_DIR } from "../paths";

const MODEL = "claude-sonnet-4-5";

const VERIFY_TOOL = {
  name: "record_verification",
  description: "Record field-by-field verification of draft against the EPD PDF.",
  input_schema: {
    type: "object",
    properties: {
      fields: {
        type: "array",
        items: {
          type: "object",
          properties: {
            fieldId: { type: "string" },
            label: { type: "string" },
            draftValue: { type: ["string", "null"] },
            pdfValue: { type: ["string", "null"] },
            status: {
              type: "string",
              enum: ["match", "mismatch", "missing_in_draft", "missing_in_pdf", "unclear"],
            },
            note: { type: ["string", "null"] },
          },
          required: ["fieldId", "label", "draftValue", "pdfValue", "status", "note"],
        },
      },
      overallNote: { type: ["string", "null"] },
    },
    required: ["fields", "overallNote"],
  },
} as const;

function pdfPathForStem(stem: string): string | null {
  const candidate = path.join(pdfDir(), `${stem}.pdf`);
  return fs.existsSync(candidate) ? candidate : null;
}

function summarize(fields: FieldVerification[]) {
  return fields.reduce(
    (acc, f) => {
      if (f.status === "match") acc.match += 1;
      else if (f.status === "mismatch") acc.mismatch += 1;
      else if (f.status === "unclear") acc.unclear += 1;
      else acc.missing += 1;
      return acc;
    },
    { match: 0, mismatch: 0, unclear: 0, missing: 0 }
  );
}

export async function verifyDraftAgainstPdf(
  stem: string,
  draft: DraftDocument,
  apiKey: string
): Promise<VerificationResult> {
  const client = new Anthropic({ apiKey });
  const pdfPath = pdfPathForStem(stem);
  const pdfAvailable = pdfPath !== null;

  const fieldList = draft.sections.flatMap((s) =>
    s.fields.map((f) => ({ fieldId: f.id, label: f.label, draftValue: f.displayValue }))
  );

  const systemPrompt = `You verify Environmental Product Declaration (EPD) extraction drafts against the source PDF.

Compare each draft field to what appears in the PDF. Be strict on identifiers, dates, names, and units.
- match: draft aligns with PDF (minor formatting differences OK)
- mismatch: PDF shows a different value
- missing_in_draft: present in PDF but draft is empty or "—"
- missing_in_pdf: draft has value but not found in PDF
- unclear: cannot determine from the document

Return one entry per draft field using the exact fieldId provided.`;

  const userContent: Anthropic.MessageCreateParams["messages"][0]["content"] = pdfAvailable
    ? [
        {
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: fs.readFileSync(pdfPath!).toString("base64"),
          },
        },
        {
          type: "text",
          text: `Verify this draft against the attached EPD PDF.

Draft fields (JSON):
${JSON.stringify(fieldList, null, 2)}

Call record_verification with your assessment for every fieldId.`,
        },
      ]
    : [
        {
          type: "text",
          text: `No PDF is available. For each draft field, set status to "unclear" and note that PDF verification requires pdfs/${stem}.pdf.

Draft fields (JSON):
${JSON.stringify(fieldList, null, 2)}`,
        },
      ];

  const response = await createMessageWithRetry(client, {
    model: MODEL,
    max_tokens: 4096,
    system: systemPrompt,
    tools: [VERIFY_TOOL],
    tool_choice: { type: "tool", name: "record_verification" },
    messages: [{ role: "user", content: userContent }],
  }, { label: "verify" });

  const toolUse = response.content.find(
    (block) => block.type === "tool_use" && block.name === "record_verification"
  );

  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error(`No verification tool response. Stop reason: ${response.stop_reason}`);
  }

  const input = toolUse.input as {
    fields: FieldVerification[];
    overallNote: string | null;
  };

  const result: VerificationResult = {
    stem,
    verifiedAt: new Date().toISOString(),
    model: MODEL,
    pdfAvailable,
    fields: input.fields,
    overallNote: input.overallNote,
    summary: summarize(input.fields),
  };

  fs.mkdirSync(VERIFICATION_DIR, { recursive: true });
  fs.writeFileSync(path.join(VERIFICATION_DIR, `${stem}.json`), JSON.stringify(result, null, 2));

  return result;
}
