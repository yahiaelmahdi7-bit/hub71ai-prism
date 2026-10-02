import { createProgram, json, jsonError, requireActor } from "../../../../lib/relocation/api.ts";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { data, actor } = await requireActor(request);
    if (actor.kind !== "organization") throw new Error("HR session is required.");
    return json({ programs: data.programs.filter((program) => program.organizationId === actor.organizationId) });
  } catch (error) {
    return jsonError(error, 401);
  }
}

export async function POST(request: Request) {
  try {
    return json(await createProgram(await request.json()));
  } catch (error) {
    return jsonError(error, 400);
  }
}
