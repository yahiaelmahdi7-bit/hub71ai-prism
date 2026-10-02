import { addConsent, json, jsonError, requireActor } from "../../../../lib/relocation/api.ts";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { data, actor } = await requireActor(request);
    if (actor.kind !== "person") throw new Error("Person session is required.");
    return json({ consents: data.consents.filter((consent) => consent.personId === actor.personId) });
  } catch (error) {
    return jsonError(error, 401);
  }
}

export async function POST(request: Request) {
  try {
    const data = await addConsent(request, await request.json());
    return json({ ok: true, consent: data.consents.at(-1) });
  } catch (error) {
    return jsonError(error, 401);
  }
}
