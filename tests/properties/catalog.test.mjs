import assert from "node:assert/strict";
import test from "node:test";

import { getRentalCatalog, toAreaId } from "../../lib/properties/catalog.ts";

test("catalog normalizes dated snapshot homes and synthetic examples separately", () => {
  const catalog = getRentalCatalog();

  assert.equal(catalog.snapshot.length, 11);
  assert.ok(catalog.synthetic.length > 10);
  assert.equal(toAreaId("Al Maryah Island"), "al-maryah-island");
  assert.equal(toAreaId("Al Reem Island"), "al-reem-island");

  for (const home of catalog.snapshot) {
    assert.equal(home.synthetic, false);
    assert.equal(home.sourceKind, "snapshot");
    assert.equal(home.availability, "unconfirmed");
    assert.match(home.areaId, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(home.sourceUrl?.startsWith("https://www.propertyfinder.ae/") || home.sourceUrl?.startsWith("https://abudhabi.dubizzle.com/"));
    if (home.contactable) {
      assert.ok(home.listingUrl?.startsWith("https://www.propertyfinder.ae/") || home.listingUrl?.startsWith("https://abudhabi.dubizzle.com/"));
    } else {
      assert.equal(home.listingUrl, null);
    }
    assert.ok(home.checkedAt.includes("2026-10-02"));
  }


  const unavailable = catalog.snapshot.find((home) => home.id === "snapshot-pf-khalifa-1br-143750243");
  const searchOnly = catalog.snapshot.filter((home) => home.id.includes("search-20261002"));
  const alReemTwoBed = catalog.snapshot.find((home) => home.id === "snapshot-pf-al-reem-2br-110500789");
  const alMaryahSearchOnly = catalog.snapshot.find((home) => home.id === "snapshot-pf-al-maryah-1br-144622199");
  const lowBudget = catalog.snapshot.find((home) => home.id === "snapshot-dubizzle-mbz-studio-105317-xsihcq");
  const imaged = catalog.snapshot.filter((home) => home.imageUrl);

  assert.equal(unavailable?.contactable, false);
  assert.equal(unavailable?.listingUrl, null);
  assert.equal(alReemTwoBed?.contactable, false);
  assert.equal(alReemTwoBed?.listingUrl, null);
  assert.equal(alMaryahSearchOnly?.contactable, false);
  assert.equal(alMaryahSearchOnly?.listingUrl, null);
  assert.ok(searchOnly.length >= 2);
  assert.ok(searchOnly.every((home) => home.contactable === false && home.listingUrl === null));
  assert.equal(lowBudget?.annualRentAed, 24000);
  assert.equal(lowBudget?.contactable, true);
  assert.ok(lowBudget?.imageUrl?.startsWith("https://dbz-images.dubizzle.com/"));
  assert.ok(imaged.length >= 2);
  assert.ok(imaged.every((home) => home.imageSourceUrl && home.imageAlt));

  for (const home of catalog.synthetic) {
    assert.equal(home.synthetic, true);
    assert.equal(home.sourceKind, "synthetic");
    assert.equal(home.availability, "illustrative");
    assert.equal(home.contactable, false);
    assert.equal(home.sourceUrl, null);
    assert.equal(home.listingUrl, null);
    assert.equal(home.imageUrl, undefined);
    assert.equal(home.imageSourceUrl, undefined);
  }
});

test("catalog source records keep provenance limitations", () => {
  const catalog = getRentalCatalog();
  const khalifaSource = catalog.sources.find((source) => source.id === "pf-khalifa-studio-150462347");

  assert.ok(khalifaSource);
  assert.equal(khalifaSource.kind, "property_portal");
  assert.equal(khalifaSource.verification, "page_opened");
  assert.ok(khalifaSource.supportedClaims.some((claim) => claim.includes("AED 40,000")));
  assert.ok(khalifaSource.limitations.some((limitation) => limitation.includes("Availability")));
});
