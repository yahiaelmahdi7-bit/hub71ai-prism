import assert from "node:assert/strict";
import test from "node:test";

import { GET } from "../../app/api/properties/route.ts";

test("properties API defaults to snapshot catalog without live source attempts", async () => {
  const response = await GET(new Request("http://bankable.test/api/properties?limit=3"));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.snapshot.ok, true);
  assert.equal(body.snapshot.sourceKind, "snapshot");
  assert.equal(body.snapshot.listings.length, 3);
  assert.deepEqual(body.sourceAttempts, []);
  assert.ok(body.sources.length >= 3);
});

test("properties API supports synthetic-only mode with non-contactable homes", async () => {
  const response = await GET(new Request("http://bankable.test/api/properties?mode=synthetic&limit=2"));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.snapshot.listings.length, 0);
  assert.equal(body.synthetic.length, 2);
  assert.ok(body.synthetic.every((home) => home.contactable === false && home.listingUrl === null));
});

test("properties API rejects invalid modes and budgets", async () => {
  const badMode = await GET(new Request("http://bankable.test/api/properties?mode=liveish"));
  const badLimit = await GET(new Request("http://bankable.test/api/properties?limit=0"));

  assert.equal(badMode.status, 400);
  assert.equal(badLimit.status, 400);
});

test("live diagnostic mode reports blocked source attempts without disguising inventory", async () => {
  const response = await GET(new Request("http://bankable.test/api/properties?mode=live-diagnostic&limit=1"));
  const body = await response.json();

  assert.ok([200, 502].includes(response.status));
  assert.ok(body.liveDiagnostic);
  assert.ok(Array.isArray(body.sourceAttempts));
  assert.match(body.warning, /diagnostics only/);
});
