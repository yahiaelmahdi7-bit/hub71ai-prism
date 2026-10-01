// npm run smoke - sends one sample PDF through the same function the app uses.
import { readFileSync, existsSync } from "node:fs";
import { analyzeDocuments } from "../lib/openai.ts";

if (!process.env.OPENAI_API_KEY) {
  console.log("SKIPPED: add OPENAI_API_KEY to .env.local");
  process.exit(0);
}
const path = new URL("../sample-docs/licence.pdf", import.meta.url);
if (!existsSync(path)) {
  console.error("sample-docs/licence.pdf is missing");
  process.exit(1);
}
try {
  const out = await analyzeDocuments([{ name: "licence.pdf", mime: "application/pdf", data: readFileSync(path) }]);
  console.log(JSON.stringify(out, null, 2));
} catch (e) {
  console.error("SMOKE FAILED:", e instanceof Error ? e.message : e);
  process.exit(1);
}
