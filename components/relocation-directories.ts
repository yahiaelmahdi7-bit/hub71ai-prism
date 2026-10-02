import fs from "node:fs";
import path from "node:path";
import catalog from "@/data/abu-dhabi/catalog.json";

type CatalogSource = { id: string; title: string; publisher: string; url: string; kind: string; checkedAt: string; verification?: string };
type CatalogArea = { id: string; name: string; summary: string; sourceIds: string[] };
type AreaGuideFile = { areas?: AreaGuideOverride[] } | AreaGuideOverride[];
type AreaGuideOverride = {
  id: string;
  image?: { src: string; alt: string; credit?: string; url?: string; checkedAt?: string };
  highlights?: string[];
  practicalActions?: string[];
  bestFor?: string[];
  caveats?: string[];
};

const sources = catalog.sources as CatalogSource[];
const sourceById = new Map(sources.map((source) => [source.id, source]));
const guideById = new Map(readAreaGuides().map((guide) => [guide.id, guide]));

const defaultAreaImages: Record<string, { src: string; alt: string; credit: string }> = {
  "al-maryah-island": { src: "/abu-dhabi-waterfront.jpg", alt: "Abu Dhabi waterfront towers near business districts", credit: "Bankable Abu Dhabi waterfront reference image" },
  "yas-island": { src: "/abu-dhabi-waterfront.jpg", alt: "Abu Dhabi waterfront used as a city planning image", credit: "Bankable Abu Dhabi waterfront reference image" },
  "saadiyat-island": { src: "/abu-dhabi-waterfront.jpg", alt: "Abu Dhabi waterfront used as an area planning image", credit: "Bankable Abu Dhabi waterfront reference image" },
  "masdar-city": { src: "/abu-dhabi-mosque-poster.jpg", alt: "Abu Dhabi city architecture reference image", credit: "Bankable Abu Dhabi city reference image" },
};
const fallbackAreaImage = { src: "/abu-dhabi-waterfront.jpg", alt: "Abu Dhabi city waterfront planning image", credit: "Bankable Abu Dhabi reference image, not a listing photo" };

export const areaDirectory = (catalog.areas as CatalogArea[]).map((area) => {
  const areaSources = area.sourceIds.map((id) => sourceById.get(id)).filter((source): source is CatalogSource => Boolean(source));
  const override = guideById.get(area.id);
  return {
    id: area.id,
    name: area.name,
    summary: practicalSummary(area, areaSources),
    catalogSummary: area.summary,
    image: override?.image ?? defaultAreaImages[area.id] ?? fallbackAreaImage,
    highlights: override?.highlights ?? practicalHighlights(area, areaSources),
    practicalActions: override?.practicalActions ?? practicalActions(area, areaSources),
    bestFor: override?.bestFor ?? bestFor(area, areaSources),
    caveats: override?.caveats ?? caveats(area, areaSources),
    sourceIds: area.sourceIds,
    sources: areaSources,
  };
});

const setupSourceIds = ["added-licensing", "adgm-registration", "kezad-setup"];

export const setupDirectory = setupSourceIds.map((id) => {
  const source = sourceById.get(id);
  if (!source) throw new Error(`Missing setup source ${id}`);
  const labels: Record<string, { name: string; next: string }> = {
    "added-licensing": { name: "Mainland through ADDED", next: "Use ADDED or TAMM for mainland licensing. Keep trade-name, licence and permit references separate." },
    "adgm-registration": { name: "ADGM establishment", next: "Use the ADGM registry route for an ADGM entity. Final submission and registration status stay with ADGM." },
    "kezad-setup": { name: "KEZAD free zone setup", next: "Use KEZAD package and facility choices separately from mainland and ADGM actions." },
  };
  return { id: id === "added-licensing" ? "mainland" : id === "adgm-registration" ? "adgm" : "kezad", ...labels[id], authority: source.publisher, url: source.url, source: `${source.title}, checked ${source.checkedAt}`, checkedAt: source.checkedAt };
});

function readAreaGuides(): AreaGuideOverride[] {
  const file = path.join(process.cwd(), "data/abu-dhabi/area-guides.json");
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as AreaGuideFile;
    return Array.isArray(parsed) ? parsed : parsed.areas ?? [];
  } catch {
    return [];
  }
}

function practicalSummary(area: CatalogArea, areaSources: CatalogSource[]) {
  if (area.sourceIds.includes("wework-hub71") || area.sourceIds.includes("cloudspaces-adgm")) return `${area.name} is useful when your work day needs ADGM or serviced-office handoffs close to the company setup route.`;
  if (area.sourceIds.includes("masdar-city-about")) return `${area.name} is included for people comparing an innovation-district base with source-backed workspace context.`;
  if (area.sourceIds.includes("cloudspaces-yas")) return `${area.name} is useful when the plan needs a named workspace provider on Yas plus housing checks from separate sources.`;
  if (areaSources.some((source) => source.id === "adrec-rental-index")) return `${area.name} can be used as a housing search area, with ADREC rental-index context before individual listings are ranked.`;
  return `${area.name} is available as a planning area once source-backed homes or work actions match your profile.`;
}

function practicalHighlights(area: CatalogArea, areaSources: CatalogSource[]) {
  const items = [];
  if (areaSources.some((source) => source.kind === "government" || source.kind === "regulator")) items.push("Official source context is available for planning checks.");
  if (area.sourceIds.includes("adrec-rental-index")) items.push("Use ADREC rental-index context as a benchmark, not as a live listing.");
  if (area.sourceIds.includes("wework-hub71")) items.push("Hub71 workspace handoff is source-linked for work planning.");
  if (area.sourceIds.includes("cloudspaces-adgm") || area.sourceIds.includes("cloudspaces-yas") || area.sourceIds.includes("cloudspaces-locations")) items.push("Cloud Spaces provider pages can be opened and recorded as opened only.");
  if (area.sourceIds.includes("adgm-office-space")) items.push("ADGM office-space context supports company setup planning.");
  return items.length ? items : ["Use as a preferred area before Bankable filters homes by budget and policy."];
}

function practicalActions(area: CatalogArea, areaSources: CatalogSource[]) {
  const actions = ["Save as a preferred area in your private move plan.", "Review homes only after affordability and company allowance filters pass."];
  if (areaSources.some((source) => source.url)) actions.push("Open source pages from the guide footer when you need to verify context.");
  return actions;
}

function bestFor(area: CatalogArea, areaSources: CatalogSource[]) {
  const fit = [];
  if (area.sourceIds.some((id) => id.includes("adgm") || id.includes("hub71"))) fit.push("ADGM or Hub71-linked work planning");
  if (area.sourceIds.some((id) => id.includes("cloudspaces"))) fit.push("serviced-office exploration");
  if (area.sourceIds.includes("adrec-rental-index")) fit.push("early housing budget comparison");
  if (area.sourceIds.includes("masdar-city-about")) fit.push("innovation-district research");
  return fit.length ? fit : ["private relocation planning"];
}

function caveats(area: CatalogArea, areaSources: CatalogSource[]) {
  const notes = ["No commute, school, amenity or rent-level claim is inferred without a dated source."];
  if (areaSources.some((source) => source.id === "adrec-rental-index")) notes.push("ADREC rental index is a benchmark guide, not a legal rent value or live unit listing.");
  return notes;
}
