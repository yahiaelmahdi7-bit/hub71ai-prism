import { json, jsonError, requireActor, requirePersonHub } from "../../../../../lib/relocation/api.ts";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { data, actor } = await requireActor(request);
    return json({ view: requirePersonHub(data, actor) });
  } catch (error) {
    return jsonError(error, 401);
  }
}
