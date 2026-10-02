import assert from "node:assert/strict";
import { test } from "node:test";

const baseUrl = process.env.BANKABLE_TEST_URL;
const options = { skip: !baseUrl && "Set BANKABLE_TEST_URL to exercise a running local app" };
const privateRoutes = [
  "/api/relocation?view=person&personId=person-sara",
  "/api/relocation?view=hr&programId=program-falcon-october-2026",
  "/api/relocation/profiles",
  "/api/relocation/programs",
  "/api/relocation/programs/program-falcon-october-2026/hr",
  "/api/relocation/consents",
];

function target(path) {
  const parsed = new URL(baseUrl);
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname), "HTTP tests must target a local instance");
  return new URL(path, parsed);
}

test("private HTTP reads reject anonymous and forged actor headers", options, async () => {
  for (const path of privateRoutes) {
    for (const headers of [{}, {
      "x-bankable-actor-kind": "organization",
      "x-bankable-actor-id": "org-falcon-analytics",
      "x-bankable-actor-label": "Untrusted caller",
    }]) {
      const response = await fetch(target(path), { headers });
      assert.ok([401, 403, 404].includes(response.status), `${path} exposed a private read: HTTP ${response.status}`);
      const body = await response.text();
      assert.doesNotMatch(body, /incomeDocuments|identityEvidence|bankResults|minMonthlyAed|privateEvidence/, `${path} returned private fields on rejection`);
    }
  }
});

test("ordinary callers cannot impersonate a confirmed provider", options, async () => {
  const response = await fetch(target("/api/relocation/actions/status"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-bankable-actor-kind": "provider",
      "x-bankable-actor-id": "forged-provider",
    },
    body: JSON.stringify({
      caseId: "case-sara",
      targetId: "task-sara-housing",
      state: "confirmed",
      source: { kind: "provider", actorId: "forged-provider", reference: "FAKE-REF" },
      updatedAt: "2099-01-01T00:00:00.000Z",
      nextAction: "No action needed",
    }),
  });
  assert.ok([400, 401, 403, 404].includes(response.status), `Forged provider update accepted: HTTP ${response.status}`);
});

test("default property HTTP feed is dated and separates synthetic homes", options, async () => {
  const response = await fetch(target("/api/properties?limit=12"));
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.ok(Array.isArray(payload.snapshot), "Default feed must expose dated snapshot inventory");
  assert.ok(Array.isArray(payload.synthetic), "Synthetic inventory must be separate");
  assert.equal(payload.sourceAttempts.length, 0, "Default feed must not silently scrape property portals");
  for (const home of payload.snapshot) {
    assert.equal(home.synthetic, false);
    assert.equal(home.sourceKind, "snapshot");
    assert.equal(home.availability, "unconfirmed");
    assert.ok(Number.isFinite(Date.parse(home.checkedAt)));
    if (home.contactable) assert.match(home.listingUrl, /^https:\/\/[^/]+\/en\/plp\/rent\//);
  }
  for (const home of payload.synthetic) {
    assert.equal(home.synthetic, true);
    assert.equal(home.contactable, false);
    assert.equal(home.listingUrl, null);
  }
});
