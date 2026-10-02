import { json, jsonError, requireActor, requirePersonHub, updatePrivateProfile } from "../../../../../lib/relocation/api.ts";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { data, actor } = await requireActor(request);
    return json({ view: requirePersonHub(data, actor) });
  } catch (error) {
    return jsonError(error, 401);
  }
}

export async function PATCH(request: Request) {
  try {
    return json(await updatePrivateProfile(request, await request.json()));
  } catch (error) {
    return jsonError(error, 400);
  }
}
