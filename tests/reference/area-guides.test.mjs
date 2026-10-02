import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "../..");
const guidePath = join(repo, "data/abu-dhabi/area-guides.json");
const catalogPath = join(repo, "data/abu-dhabi/catalog.json");

const areaGuides = JSON.parse(readFileSync(guidePath, "utf8"));
const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));

assert.equal(areaGuides.version, "2026-10-02.abudhabi-area-guides.v1");
assert.match(areaGuides.checkedAt, /^2026-10-02T\d{2}:\d{2}:\d{2}\+04:00$/, "checkedAt should be Gulf-time ISO");
assert.ok(Array.isArray(areaGuides.sources), "sources must be an array");
assert.ok(areaGuides.guides && typeof areaGuides.guides === "object", "guides must be keyed by area id");

const sourceById = new Map(areaGuides.sources.map((source) => [source.id, source]));
assert.equal(sourceById.size, areaGuides.sources.length, "source ids must be unique");

const guideIds = Object.keys(areaGuides.guides).sort();
const catalogAreaIds = catalog.areas.map((area) => area.id).sort();
for (const id of catalogAreaIds) {
  assert.ok(areaGuides.guides[id], `missing guide for catalog area ${id}`);
}
assert.ok(areaGuides.guides["saadiyat-island"], "missing verified Saadiyat guide");
assert.equal(areaGuides.guides["saadiyat-island"].catalogArea, false, "Saadiyat remains guide-only for now");
assert.equal(areaGuides.guides["mohamed-bin-zayed-city"].catalogArea, true, "MBZ must resolve as a catalog area for property browsing");
assert.deepEqual(areaGuides.guides["saadiyat-island"].sourceIds, ["vad-saadiyat-cultural-district", "vad-saadiyat-beach"]);
assert.ok(areaGuides.guides["mohamed-bin-zayed-city"].sourceIds.includes("dubizzle-mbz-studio-105317-xsihcq"), "MBZ guide should link the verified studio source");
assert.equal(guideIds.length, catalogAreaIds.length + 1, "guides should cover catalog areas plus Saadiyat only");

const usedSourceIds = new Set();
const internalLanguage = /\b(benchmark|audit|source-backed|verification|guardrail|do not infer|internal)\b/i;

for (const [areaId, guide] of Object.entries(areaGuides.guides)) {
  assert.equal(guide.areaId, areaId, `${areaId} areaId mismatch`);
  assert.ok(typeof guide.name === "string" && guide.name.length > 2, `${areaId} missing name`);
  assert.ok(typeof guide.mood === "string" && guide.mood.length > 8, `${areaId} missing mood`);
  assert.ok(typeof guide.shortBlurb === "string" && guide.shortBlurb.length > 40, `${areaId} missing shortBlurb`);
  assert.doesNotMatch(guide.mood, internalLanguage, `${areaId} mood contains internal wording`);
  assert.doesNotMatch(guide.shortBlurb, internalLanguage, `${areaId} shortBlurb contains internal wording`);

  assert.ok(Array.isArray(guide.factualHighlights) && guide.factualHighlights.length >= 2, `${areaId} needs factual highlights`);
  assert.ok(Array.isArray(guide.practicalTips) && guide.practicalTips.length >= 2, `${areaId} needs practical tips`);
  assert.ok(Array.isArray(guide.sourceIds) && guide.sourceIds.length > 0, `${areaId} missing source ids`);

  for (const sourceId of guide.sourceIds) {
    assert.ok(sourceById.has(sourceId), `${areaId} references unknown source ${sourceId}`);
    usedSourceIds.add(sourceId);
  }

  for (const highlight of guide.factualHighlights) {
    assert.ok(highlight.text.length > 20, `${areaId} highlight too short`);
    assert.doesNotMatch(highlight.text, internalLanguage, `${areaId} highlight contains internal wording`);
    assert.ok(Array.isArray(highlight.sourceIds) && highlight.sourceIds.length > 0, `${areaId} highlight missing source ids`);
    for (const sourceId of highlight.sourceIds) {
      assert.ok(guide.sourceIds.includes(sourceId), `${areaId} highlight source ${sourceId} not listed on guide`);
      usedSourceIds.add(sourceId);
    }
  }

  for (const tip of guide.practicalTips) {
    assert.equal(tip.kind, "planning_suggestion", `${areaId} practical tip must be marked as planning suggestion`);
    assert.ok(tip.text.length > 20, `${areaId} practical tip too short`);
    assert.doesNotMatch(tip.text, internalLanguage, `${areaId} practical tip contains internal wording`);
    assert.ok(Array.isArray(tip.sourceIds) && tip.sourceIds.length > 0, `${areaId} practical tip missing source ids`);
    for (const sourceId of tip.sourceIds) {
      assert.ok(guide.sourceIds.includes(sourceId), `${areaId} practical tip source ${sourceId} not listed on guide`);
      usedSourceIds.add(sourceId);
    }
  }

  const image = guide.image;
  assert.ok(image && typeof image === "object", `${areaId} missing image`);
  assert.match(image.localPath, /^\/areas\/[a-z0-9-]+\.(jpg|png)$/i, `${areaId} image localPath must be public /areas path`);
  assert.ok(existsSync(join(repo, "public", image.localPath)), `${areaId} image file missing at ${image.localPath}`);
  assert.ok(image.photographer?.length > 1, `${areaId} missing image photographer`);
  // Two allowed provenances: Wikimedia Commons (CC licence) or Relaam's neighbourhood guide, credited as Relaam.
  if (image.sourceUrl.startsWith("https://www.relaam.com/")) {
    assert.match(image.sourceUrl, /^https:\/\/www\.relaam\.com\/neighborhoods\/[a-z0-9-]+$/, `${areaId} Relaam image must link its neighbourhood page`);
    assert.equal(image.photographer, "Relaam", `${areaId} Relaam image must credit Relaam`);
    assert.equal(image.license, "© Relaam", `${areaId} Relaam image must carry the Relaam copyright line`);
  } else {
    assert.match(image.sourceUrl, /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/, `${areaId} image source must be Wikimedia Commons file page`);
    assert.match(image.license, /^CC BY/, `${areaId} expected Creative Commons attribution license`);
    assert.match(image.licenseUrl, /^https:\/\/creativecommons\.org\/licenses\//, `${areaId} missing Creative Commons license URL`);
  }
  assert.ok(image.caption?.length > 20, `${areaId} missing image caption`);
  assert.match(image.downloadedAt, /^2026-10-02T\d{2}:\d{2}:\d{2}\+04:00$/, `${areaId} image downloadedAt should be Gulf-time ISO`);

  if (image.exactAreaPhoto === false) {
    assert.match(image.caption, /context/i, `${areaId} fallback caption must identify context image`);
    assert.match(image.caption, /not claimed|not a .*photo/i, `${areaId} fallback caption must avoid fake area claim`);
  } else {
    assert.equal(image.exactAreaPhoto, true, `${areaId} image exactAreaPhoto must be boolean`);
    assert.doesNotMatch(image.caption, /not claimed|not a .*photo/i, `${areaId} exact image caption should not use fallback wording`);
  }
}

for (const sourceId of usedSourceIds) {
  const source = sourceById.get(sourceId);
  assert.equal(source.verification, "page_opened", `${sourceId} is displayed and must be page-opened evidence`);
  assert.match(source.checkedAt, /^2026-10-02T\d{2}:\d{2}:\d{2}\+04:00$/, `${sourceId} checkedAt should be Gulf-time ISO`);
  assert.ok(source.url.startsWith("https://"), `${sourceId} source URL must be HTTPS`);
  assert.ok(source.supportedFacts?.length > 0, `${sourceId} missing supported facts`);
}

for (const source of areaGuides.sources) {
  assert.equal(source.verification, "page_opened", `${source.id} must be opened evidence or kept out of the guide source list`);
}

console.log(`area guides ok: ${guideIds.length} guides, ${usedSourceIds.size} displayed sources`);
