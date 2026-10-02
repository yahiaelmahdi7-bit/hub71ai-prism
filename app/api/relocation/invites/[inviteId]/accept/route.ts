import { acceptInvite, json, jsonError } from "../../../../../../lib/relocation/api.ts";

export const runtime = "nodejs";

type Context = { params: Promise<{ inviteId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const { inviteId } = await context.params;
    return json(await acceptInvite(inviteId, await request.json()));
  } catch (error) {
    return jsonError(error, 400);
  }
}
