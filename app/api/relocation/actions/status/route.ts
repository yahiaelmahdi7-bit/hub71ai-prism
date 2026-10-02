import { json, jsonError, reportStatus } from "../../../../../lib/relocation/api.ts";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    return json(await reportStatus(request, await request.json()));
  } catch (error) {
    return jsonError(error, 400);
  }
}
