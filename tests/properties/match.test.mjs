import assert from "node:assert/strict";
import test from "node:test";

import { getRentalCatalog } from "../../lib/properties/catalog.ts";
import { matchHomes } from "../../lib/properties/match.ts";

const baseProfile = {
  household: { adults: 1, children: 0 },
  income: { minMonthlyAed: 20000, maxMonthlyAed: 24000 },
  preferredAreaIds: ["al-reem-island"],
};

test("matchHomes filters by allowance and income before preference scoring", () => {
  const homes = [
    {
      id: "preferred-too-expensive",
      title: "Preferred but too expensive",
      area: "Al Reem Island",
      areaId: "al-reem-island",
      annualRentAed: 125000,
      bedrooms: 1,
      bathrooms: 1,
      sizeSqft: 800,
      synthetic: false,
      source: "propertyfinder",
      sourceUrl: "https://www.propertyfinder.ae/example",
      listingUrl: "https://www.propertyfinder.ae/example",
      checkedAt: "2026-10-02T10:00:00+04:00",
      sourceKind: "snapshot",
      contactable: true,
      availability: "unconfirmed",
    },
    {
      id: "non-preferred-affordable",
      title: "Affordable non-preferred",
      area: "Khalifa City",
      areaId: "khalifa-city",
      annualRentAed: 70000,
      bedrooms: 1,
      bathrooms: 1,
      sizeSqft: 900,
      synthetic: false,
      source: "propertyfinder",
      sourceUrl: "https://www.propertyfinder.ae/example-2",
      listingUrl: "https://www.propertyfinder.ae/example-2",
      checkedAt: "2026-10-02T10:00:00+04:00",
      sourceKind: "snapshot",
      contactable: true,
      availability: "unconfirmed",
    },
  ];

  const result = matchHomes(baseProfile, { annualAllowanceAed: 90000, maxRentShareOfIncome: 0.5 }, homes);

  assert.deepEqual(result.matches.map((match) => match.home.id), ["non-preferred-affordable"]);
  assert.deepEqual(result.excluded.map((excluded) => excluded.listingId), ["preferred-too-expensive"]);
  assert.equal(result.annualBudgetAed, 90000);
});

test("matchHomes caps budget by income when income is lower than allowance", () => {
  const catalog = getRentalCatalog();
  const result = matchHomes(
    { ...baseProfile, income: { minMonthlyAed: 10000, maxMonthlyAed: 12000 } },
    { annualAllowanceAed: 200000, maxRentShareOfIncome: 0.4 },
    catalog.snapshot,
  );

  assert.equal(result.annualBudgetAed, 48000);
  assert.ok(result.matches.every((match) => match.home.annualRentAed <= 48000));
  assert.ok(result.excluded.length > 0);
});

test("matchHomes returns blockers when no homes match", () => {
  const catalog = getRentalCatalog();
  const result = matchHomes(
    { ...baseProfile, income: { minMonthlyAed: 5000, maxMonthlyAed: 6000 } },
    { annualAllowanceAed: 20000, maxRentShareOfIncome: 0.3 },
    catalog.snapshot,
  );

  assert.equal(result.matches.length, 0);
  assert.ok(result.assumptions.some((assumption) => assumption.includes("No homes remained")));
});

test("matchHomes rejects invalid budget inputs", () => {
  assert.throws(
    () => matchHomes(baseProfile, { annualAllowanceAed: -1, maxRentShareOfIncome: 0.4 }, []),
    /annualAllowanceAed/,
  );
  assert.throws(
    () => matchHomes(baseProfile, { annualAllowanceAed: 100000, maxRentShareOfIncome: 1.5 }, []),
    /maxRentShareOfIncome/,
  );
  assert.throws(
    () =>
      matchHomes(
        { ...baseProfile, income: { minMonthlyAed: 0, maxMonthlyAed: 1000 } },
        { annualAllowanceAed: 100000, maxRentShareOfIncome: 0.5 },
        [],
      ),
    /minMonthlyAed/,
  );
});
