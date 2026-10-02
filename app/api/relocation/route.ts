import {
  createPrivateProfile,
  createProgram,
  json,
  jsonError,
  liveDemoBootstrapAllowed,
  requireActor,
  requireHrView,
  requirePersonHub,
  seedDemoWithCapabilities,
} from "../../../lib/relocation/api.ts";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const operation = url.searchParams.get("op") ?? "me";
    const { data, actor } = await requireActor(request);

    if (operation === "me") return json({ view: requirePersonHub(data, actor) });
    if (operation === "hr") return json({ view: requireHrView(data, actor, url.searchParams.get("programId") ?? "") });

    return json({ error: "Unknown operation." }, 400);
  } catch (error) {
    return jsonError(error, 401);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const operation = String(body.operation ?? body.action ?? "");

    if (operation === "bootstrap_demo") {
      if (!liveDemoBootstrapAllowed()) return json({ error: "Demo bootstrap is disabled in production." }, 403);
      return json(await seedDemoWithCapabilities());
    }
    if (operation === "create_profile") return json(await createPrivateProfile(body));
    if (operation === "create_program") return json(await createProgram(body));

    return json({ error: "Unknown operation." }, 400);
  } catch (error) {
    return jsonError(error, 400);
  }
}
