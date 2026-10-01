import { analyzeDocuments, type InputDoc } from "@/lib/openai";

export const runtime = "nodejs";
export const maxDuration = 300;

const ALLOWED = new Set(["application/pdf", "image/png", "image/jpeg"]);
const MAX_BYTES = 20 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const files = form.getAll("files").filter((f): f is File => f instanceof File);
    if (files.length === 0) return Response.json({ error: "No files received." }, { status: 400 });

    const docs: InputDoc[] = [];
    for (const f of files) {
      if (!ALLOWED.has(f.type)) return Response.json({ error: `${f.name}: only PDF, PNG or JPG.` }, { status: 400 });
      if (f.size > MAX_BYTES) return Response.json({ error: `${f.name} is over 20 MB.` }, { status: 400 });
      docs.push({ name: f.name, mime: f.type, data: Buffer.from(await f.arrayBuffer()) });
    }
    const result = await analyzeDocuments(docs);
    return Response.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
