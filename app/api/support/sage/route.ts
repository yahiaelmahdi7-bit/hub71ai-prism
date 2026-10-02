import { createSageReply } from "../../../../lib/support/sage.ts";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Send a short support message." }, { status: 400 });
  }

  const body = typeof payload === "object" && payload !== null ? payload as { message?: unknown; path?: unknown } : {};
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const path = typeof body.path === "string" ? body.path.trim() : "";

  if (!message) return Response.json({ error: "Send a short support message." }, { status: 400 });
  if (message.length > 1000) return Response.json({ error: "Keep support messages under 1000 characters." }, { status: 413 });

  return Response.json(createSageReply({ message, path }));
}
