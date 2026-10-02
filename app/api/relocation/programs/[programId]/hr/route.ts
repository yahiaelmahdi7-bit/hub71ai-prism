import { json, jsonError, requireActor, requireHrView } from "../../../../../../lib/relocation/api.ts";

export const runtime = "nodejs";

type Context = { params: Promise<{ programId: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const { programId } = await context.params;
    const { data, actor } = await requireActor(request);
    return json({ view: requireHrView(data, actor, programId) });
  } catch (error) {
    return jsonError(error, 401);
  }
}
