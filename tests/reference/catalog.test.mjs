import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const catalog = JSON.parse(readFileSync(new URL("../../data/abu-dhabi/catalog.json", import.meta.url), "utf8"));

const requiredTopLevel = ["version", "checkedAt", "sources", "areas", "workspaces", "services", "financialFactors"];
for (const key of requiredTopLevel) {
  assert.ok(key in catalog, `missing ${key}`);
}

assert.ok(catalog.sources.length >= 12, "expected at least 12 primary source records");
assert.ok(catalog.areas.length >= 6, "expected at least 6 areas");
assert.ok(catalog.workspaces.length >= 3, "expected at least 3 real workspace records");
assert.ok(catalog.services.some((service) => service.id === "company-mainland-added"), "missing mainland setup service");
assert.ok(catalog.services.some((service) => service.id === "company-adgm-registration"), "missing ADGM setup service");
assert.ok(catalog.services.some((service) => service.id === "company-kezad-setup"), "missing KEZAD setup service");
assert.ok(catalog.services.some((service) => service.id === "freelancer-added-licence"), "missing ADDED freelancer licence route");
assert.ok(catalog.services.some((service) => service.id === "personal-bank-current-account"), "missing bank account readiness/opening route");
assert.ok(catalog.sources.some((source) => source.id === "adrec-rental-index"), "missing ADREC rental index guide source");
assert.ok(catalog.financialFactors.some((factor) => factor.id === "current-account-documents"), "missing bank-account readiness factor");

const workBundle = catalog.services.find((service) => service.id === "employee-work-bundle");
assert.deepEqual(workBundle?.jurisdictions, ["mainland"], "MoHRE Work Bundle must not be modeled as universal across free zones");
assert.deepEqual(catalog.services.find((service) => service.id === "adgm-employee-visa-services")?.jurisdictions, ["adgm"]);
assert.deepEqual(catalog.services.find((service) => service.id === "kezad-employee-residence-services")?.jurisdictions, ["kezad"]);

const sourceIds = new Set(catalog.sources.map((source) => source.id));
for (const source of catalog.sources) {
  assert.equal(source.verification, "page_opened", `${source.id} must be based on an opened page`);
  assert.match(source.checkedAt, /^2026-10-02T\d{2}:\d{2}:\d{2}\+04:00$/, `${source.id} checkedAt should be Gulf-time ISO`);
  assert.ok(source.supportedClaims.length > 0, `${source.id} needs supported claims`);
  assert.ok(source.limitations.length > 0, `${source.id} needs limitations`);
}

for (const groupName of ["areas", "workspaces", "services", "financialFactors"]) {
  for (const record of catalog[groupName]) {
    assert.ok(record.sourceIds.length > 0, `${groupName}.${record.id} missing source ids`);
    for (const sourceId of record.sourceIds) {
      assert.ok(sourceIds.has(sourceId), `${groupName}.${record.id} references unknown source ${sourceId}`);
    }
  }
}

for (const area of catalog.areas) {
  const summary = area.summary.toLowerCase();
  assert.doesNotMatch(summary, /property finder|snapshot|calibration/, `${area.id} summary must not cite uncataloged property evidence`);
  assert.doesNotMatch(summary, /commute time|car-based|lifestyle-led|premium/, `${area.id} summary must not invent lifestyle or commute positioning`);

  if (area.sourceIds.length === 1 && area.sourceIds[0] === "adrec-rental-index") {
    assert.match(summary, /adrec|rental-index|rental benchmarking|area filter/, `${area.id} must describe ADREC-only support as benchmark guidance`);
    assert.match(summary, /dated|source|evidence|listing/, `${area.id} must require separate dated evidence for specific recommendations`);
  }
}

for (const factor of catalog.financialFactors) {
  assert.equal(factor.providerDecides, true, `${factor.id} must stay provider-decided`);
}

for (const workspace of catalog.workspaces) {
  assert.ok(workspace.actionLabel.startsWith("Open "), `${workspace.id} action must be an honest open action`);
}

console.log(`catalog ok: ${catalog.sources.length} sources, ${catalog.services.length} services`);
