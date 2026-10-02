import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const setupGuides = JSON.parse(readFileSync(new URL("../../data/abu-dhabi/setup-guides.json", import.meta.url), "utf8"));
const catalog = JSON.parse(readFileSync(new URL("../../data/abu-dhabi/catalog.json", import.meta.url), "utf8"));

assert.equal(setupGuides.version, "2026-10-02.abudhabi-setup-guides.v1");
assert.match(setupGuides.checkedAt, /^2026-10-02T\d{2}:\d{2}:\d{2}\+04:00$/);
assert.equal(setupGuides.sourceCatalog, "data/abu-dhabi/catalog.json");
assert.equal(setupGuides.profiles.length, 3, "mainland, ADGM and KEZAD profiles only");

const catalogSourceIds = new Set(catalog.sources.map((source) => source.id));
const catalogServiceIds = new Set(catalog.services.map((service) => service.id));
const profiles = new Map(setupGuides.profiles.map((profile) => [profile.jurisdiction, profile]));

for (const jurisdiction of ["mainland", "adgm", "kezad"]) {
  assert.ok(profiles.has(jurisdiction), `missing ${jurisdiction} setup profile`);
}

for (const profile of setupGuides.profiles) {
  assert.ok(profile.title.length > 10, `${profile.jurisdiction} missing title`);
  assert.ok(profile.overview.length > 40, `${profile.jurisdiction} missing overview`);
  assert.ok(profile.whoHandlesIt.length > 40, `${profile.jurisdiction} missing whoHandlesIt`);
  assert.ok(profile.officialChannel?.url?.startsWith("https://"), `${profile.jurisdiction} missing official channel`);
  assert.ok(profile.preparationSteps.length >= 4, `${profile.jurisdiction} needs useful preparation steps`);
  assert.ok(profile.providerResources.length >= 2, `${profile.jurisdiction} needs provider resources`);
  assert.match(profile.unknowns.fees, /Unknown in Yala AD/i, `${profile.jurisdiction} fees must not be invented`);
  assert.match(profile.unknowns.timing, /Unknown in Yala AD/i, `${profile.jurisdiction} timing must not be invented`);
  assert.ok(profile.limitations.some((text) => /opened|sync|consent|eligibility|checklist/i.test(text)), `${profile.jurisdiction} needs status/privacy/eligibility boundary`);

  const stepKinds = new Set(profile.preparationSteps.map((step) => step.kind));
  assert.ok(stepKinds.has("official_requirement"), `${profile.jurisdiction} missing official requirements`);
  assert.ok(stepKinds.has("guided_planning_step"), `${profile.jurisdiction} missing guided planning steps`);

  for (const serviceId of profile.relatedServiceIds) {
    assert.ok(catalogServiceIds.has(serviceId), `${profile.jurisdiction} unknown service ${serviceId}`);
  }

  for (const sourceId of profile.sourceIds) {
    assert.ok(catalogSourceIds.has(sourceId), `${profile.jurisdiction} unknown source ${sourceId}`);
  }

  for (const step of profile.preparationSteps) {
    assert.ok(step.text.length > 25, `${profile.jurisdiction} step too short`);
    assert.doesNotMatch(step.text, /generic checklist/i, `${profile.jurisdiction} must not expose generic checklist language`);
    for (const sourceId of step.sourceIds) {
      assert.ok(profile.sourceIds.includes(sourceId), `${profile.jurisdiction} step source ${sourceId} not listed on profile`);
      assert.ok(catalogSourceIds.has(sourceId), `${profile.jurisdiction} unknown step source ${sourceId}`);
    }
  }
}

assert.deepEqual(profiles.get("mainland").relatedServiceIds, ["company-mainland-added", "employee-work-bundle"]);
assert.deepEqual(profiles.get("adgm").relatedServiceIds, ["company-adgm-registration", "adgm-employee-visa-services"]);
assert.deepEqual(profiles.get("kezad").relatedServiceIds, ["company-kezad-setup", "kezad-employee-residence-services"]);

console.log("setup guides ok: 3 jurisdiction profiles");
