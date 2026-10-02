import assert from "node:assert/strict";
import test from "node:test";

const sage = await import("../../lib/support/sage.ts");
const route = await import("../../app/api/support/sage/route.ts");

test("Sage routes setup questions to separate setup actions with sources", () => {
  const reply = sage.createSageReply({ message: "I need ADGM setup help for my company", path: "/start" });
  assert.equal(reply.assistant, "Sage");
  assert.equal(reply.mode, "local_navigator");
  assert.ok(reply.message.includes("Mainland, ADGM and KEZAD"));
  assert.ok(reply.actions.some((action) => action.href === "/company"));
  assert.ok(reply.sources.some((source) => source.id === "adgm-registration"));
});

test("Sage homes guidance stays inside allowlisted local routes", () => {
  const reply = sage.createSageReply({ message: "show me apartments and agent listings" });
  assert.ok(reply.actions.length >= 2);
  for (const action of reply.actions) {
    assert.match(action.href, /^\/(?:start|move|company|join|areas|homes|setup|$)/);
    assert.doesNotMatch(action.href, /^https?:/);
  }
  assert.match(reply.message, /affordability and allowance filters/i);
});

test("support route rejects oversized chat messages", async () => {
  const response = await route.POST(new Request("http://yala.test/api/support/sage", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message: "x".repeat(1001) }),
  }));
  assert.equal(response.status, 413);
});

test("support route returns navigator actions", async () => {
  const response = await route.POST(new Request("http://yala.test/api/support/sage", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message: "where should I live", path: "/move" }),
  }));
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.assistant, "Sage");
  assert.ok(body.actions.some((action) => action.href === "/areas"));
});
