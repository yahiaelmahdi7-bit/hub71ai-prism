import { json, jsonError, openExternal } from "../../../../../lib/relocation/api.ts";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const data = await openExternal(request, await request.json());
    return json({ ok: true, latestEvent: data.events.at(-1) });
  } catch (error) {
    return jsonError(error, 401);
  }
}
