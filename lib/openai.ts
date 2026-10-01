// The ONE place that talks to OpenAI. Tomorrow's stages swap SCHEMA / PROMPT here (or add a sibling function).
// API shape verified 2026-10-01 against developers.openai.com guides "pdf-files" + "file-inputs"
// (input_file{filename,file_data}, input_image{image_url}, text.format json_schema strict) via context7.
import OpenAI from "openai";

export type InputDoc = { name: string; mime: string; data: Buffer };

export const MODEL = process.env.OPENAI_MODEL || "gpt-5.6";

// PLACEHOLDER schema: per document {doc_type, person_name, issue_date, amounts[], notes}.
// Strict mode: every property required, additionalProperties false, optional values are nullable.
export const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["documents"],
  properties: {
    documents: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["file_name", "doc_type", "person_name", "issue_date", "amounts", "notes"],
        properties: {
          file_name: { type: "string" },
          doc_type: { type: "string", description: "e.g. bank_statement, invoice, contract, licence, id_summary, other" },
          person_name: { type: ["string", "null"] },
          issue_date: { type: ["string", "null"], description: "ISO date YYYY-MM-DD if present" },
          amounts: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["label", "value", "currency"],
              properties: {
                label: { type: "string" },
                value: { type: "number" },
                currency: { type: "string" },
              },
            },
          },
          notes: { type: "string" },
        },
      },
    },
  },
} as const;

export const PROMPT =
  "You read financial and identity documents for a self-employed person. For each attached document, " +
  "extract only what is printed on it. Do not guess. Use null when a value is absent. Dates as YYYY-MM-DD.";

function toContent(doc: InputDoc) {
  const b64 = doc.data.toString("base64");
  const url = `data:${doc.mime};base64,${b64}`;
  if (doc.mime === "application/pdf") {
    return { type: "input_file" as const, filename: doc.name, file_data: url };
  }
  return { type: "input_image" as const, image_url: url, detail: "high" as const };
}

export async function analyzeDocuments(docs: InputDoc[]) {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not set (add it to .env.local)");
  const client = new OpenAI();
  const response = await client.responses.create({
    model: MODEL,
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: PROMPT },
          ...docs.flatMap((d) => [{ type: "input_text" as const, text: `File: ${d.name}` }, toContent(d)]),
        ],
      },
    ],
    text: { format: { type: "json_schema", name: "documents_extraction", strict: true, schema: SCHEMA as unknown as Record<string, unknown> } },
  });
  return JSON.parse(response.output_text);
}
