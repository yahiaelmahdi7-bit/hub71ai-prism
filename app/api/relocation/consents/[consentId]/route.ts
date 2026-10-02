import { json, jsonError, revokeConsentById } from "../../../../../lib/relocation/api.ts";

export const runtime = "nodejs";

type Context = { params: Promise<{ consentId: string }> };

export async function DELETE(request: Request, context: Context) {
  try {
    const { consentId } = await context.params;
    const data = await revokeConsentById(request, consentId);
    return json({ ok: true, consent: data.consents.find((item) => item.id === consentId) });
  } catch (error) {
    return jsonError(error, 401);
  }
}
