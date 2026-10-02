import { createEstablishedCompanyDemo, hrProgramView } from "../../../../lib/relocation/data.ts";
import { liveDemoBootstrapAllowed, json, jsonError, seedDemoWithCapabilities } from "../../../../lib/relocation/api.ts";

export const runtime = "nodejs";

export async function GET() {
  try {
    const data = createEstablishedCompanyDemo();
    return json({
      demo: {
        hr: hrProgramView(data, "program-falcon-october-2026", "org-falcon-analytics"),
        employees: data.people.map((person) => ({ personId: person.id, displayName: person.displayName })),
      },
    });
  } catch (error) {
    return jsonError(error, 400);
  }
}

export async function POST() {
  try {
    if (!liveDemoBootstrapAllowed()) return json({ error: "Demo bootstrap is disabled in production." }, 403);
    return json(await seedDemoWithCapabilities());
  } catch (error) {
    return jsonError(error, 400);
  }
}
