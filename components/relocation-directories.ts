import fs from "node:fs";
import path from "node:path";
import catalog from "@/data/abu-dhabi/catalog.json";

type CatalogSource = { id: string; title: string; publisher: string; url: string; kind: string; checkedAt: string; verification?: string };
type CatalogArea = { id: string; name: string; summary: string; sourceIds: string[] };
type CatalogService = { id: string; title: string; category: string; authority: string; audience: string; jurisdictions?: string[]; actionUrl: string; nextAction: string; requirements: string[]; sourceIds: string[]; limitations?: string[] };
type GuideImage = { localPath?: string; src?: string; caption?: string; alt?: string; photographer?: string; license?: string; sourceUrl?: string; checkedAt?: string; exactAreaPhoto?: boolean; credit?: string };
type AreaGuideOverride = { id?: string; areaId?: string; name?: string; mood?: string; shortBlurb?: string; factualHighlights?: { text: string; sourceIds?: string[] }[]; practicalTips?: { text: string; sourceIds?: string[]; kind?: string }[]; image?: GuideImage; highlights?: string[]; practicalActions?: string[]; bestFor?: string[]; caveats?: string[] };
type AreaGuideFile = { areas?: AreaGuideOverride[]; guides?: Record<string, AreaGuideOverride> | AreaGuideOverride[] } | AreaGuideOverride[];
type SetupGuideProfile = { jurisdiction: string; title: string; overview: string; whoHandlesIt: string; relatedServiceIds: string[]; officialChannel: { label: string; url: string; sourceIds: string[] }; preparationSteps: { kind: string; text: string; sourceIds?: string[] }[]; providerResources: { label: string; url: string; sourceIds: string[] }[]; unknowns: string[]; limitations: string[]; sourceIds: string[] };
export type AreaDirectoryItem = {
  id: string;
  name: string;
  summary: string;
  catalogSummary: string;
  mood: string | null;
  image: { src: string; alt: string; credit: string };
  highlights: string[];
  practicalActions: string[];
  bestFor: string[];
  caveats: string[];
  sourceIds: string[];
  sources: CatalogSource[];
};

const catalogData = catalog as { sources: CatalogSource[]; areas: CatalogArea[]; services: CatalogService[] };
const sources = catalogData.sources;
const sourceById = new Map(sources.map((source) => [source.id, source]));
const guideEntries = readAreaGuides()
  .map((guide): [string, AreaGuideOverride] => [guide.areaId ?? guide.id ?? "", guide])
  .filter((entry): entry is [string, AreaGuideOverride] => Boolean(entry[0]));
const guideById = new Map<string, AreaGuideOverride>(guideEntries);

const defaultAreaImages: Record<string, { src: string; alt: string; credit: string }> = {
  "al-maryah-island": { src: "/abu-dhabi-waterfront.jpg", alt: "Abu Dhabi waterfront towers near business districts", credit: "Yala AD Abu Dhabi waterfront reference image" },
  "yas-island": { src: "/abu-dhabi-waterfront.jpg", alt: "Abu Dhabi waterfront used as a city planning image", credit: "Yala AD Abu Dhabi waterfront reference image" },
  "saadiyat-island": { src: "/abu-dhabi-waterfront.jpg", alt: "Abu Dhabi waterfront used as an area planning image", credit: "Yala AD Abu Dhabi waterfront reference image" },
  "masdar-city": { src: "/abu-dhabi-mosque-poster.jpg", alt: "Abu Dhabi city architecture reference image", credit: "Yala AD Abu Dhabi city reference image" },
};
const fallbackAreaImage = { src: "/abu-dhabi-waterfront.jpg", alt: "Abu Dhabi city waterfront planning image", credit: "Yala AD Abu Dhabi reference image, not a listing photo" };

export const areaDirectory: AreaDirectoryItem[] = catalogData.areas.map((area) => {
  const areaSources = area.sourceIds.map((id) => sourceById.get(id)).filter((source): source is CatalogSource => Boolean(source));
  const override = guideById.get(area.id);
  return {
    id: area.id,
    name: override?.name ?? area.name,
    summary: override?.shortBlurb ?? practicalSummary(area, areaSources),
    catalogSummary: area.summary,
    mood: override?.mood ?? null,
    image: guideImage(override) ?? defaultAreaImages[area.id] ?? fallbackAreaImage,
    highlights: override?.highlights ?? override?.factualHighlights?.map((item) => item.text) ?? practicalHighlights(area, areaSources),
    practicalActions: override?.practicalActions ?? override?.practicalTips?.map((item) => item.text) ?? practicalActions(area, areaSources),
    bestFor: override?.bestFor ?? (override?.mood ? [override.mood] : bestFor(area)),
    caveats: override?.caveats ?? caveats(area, areaSources),
    sourceIds: area.sourceIds,
    sources: areaSources,
  };
});

const setupProfiles = readSetupGuides();

export const setupDirectory = setupProfiles.map((profile) => {
  const profileSources = profile.sourceIds.map((id) => sourceById.get(id)).filter((source): source is CatalogSource => Boolean(source));
  const primarySource = profileSources[0];
  const relatedServices = profile.relatedServiceIds
    .map((id) => catalogData.services.find((service) => service.id === id))
    .filter((service): service is CatalogService => Boolean(service));
  return {
    id: profile.jurisdiction,
    name: profile.title,
    next: profile.overview,
    overview: profile.overview,
    whoHandlesIt: profile.whoHandlesIt,
    authority: primarySource?.publisher ?? relatedServices[0]?.authority ?? profile.title,
    url: profile.officialChannel.url,
    source: `${primarySource?.title ?? profile.officialChannel.label}, checked ${primarySource?.checkedAt ?? "2026-10-02"}`,
    checkedAt: primarySource?.checkedAt ?? "2026-10-02",
    prepare: profile.preparationSteps.map((step) => step.text),
    officialSteps: profile.preparationSteps.filter((step) => step.kind === "official_requirement").map((step) => step.text),
    planningSteps: profile.preparationSteps.filter((step) => step.kind !== "official_requirement").map((step) => step.text),
    resources: profile.providerResources,
    related: relatedServices.map((service) => service.title),
    relatedServices,
    unknowns: profile.unknowns,
    limitations: profile.limitations,
    sources: profileSources,
    officialChannel: profile.officialChannel,
  };
});

// Read once at module load: in `next dev`, edits to the JSON only show after this file recompiles.
function readAreaGuides(): AreaGuideOverride[] {
  const file = path.join(process.cwd(), "data/abu-dhabi/area-guides.json");
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as AreaGuideFile;
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed.areas)) return parsed.areas;
    if (Array.isArray(parsed.guides)) return parsed.guides;
    return parsed.guides ? Object.values(parsed.guides) : [];
  } catch { return []; }
}

function readSetupGuides(): SetupGuideProfile[] {
  const file = path.join(process.cwd(), "data/abu-dhabi/setup-guides.json");
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as { profiles?: SetupGuideProfile[] };
    return parsed.profiles ?? [];
  } catch {
    return [];
  }
}

function guideImage(guide?: AreaGuideOverride) {
  const image = guide?.image;
  const src = image?.localPath ?? image?.src;
  if (!image || !src) return null;
  const credit = image.credit ?? [image.caption, image.photographer ? `Photo: ${image.photographer}` : null, image.license].filter(Boolean).join(" · ");
  return { src, alt: image.alt ?? image.caption ?? `${guide?.name ?? "Abu Dhabi area"} photo`, credit: credit || "Licensed area image" };
}

function practicalSummary(area: CatalogArea, areaSources: CatalogSource[]) {
  if (area.sourceIds.includes("wework-hub71") || area.sourceIds.includes("cloudspaces-adgm")) return `${area.name} is useful when your work day needs ADGM or serviced-office handoffs close to the company setup route.`;
  if (area.sourceIds.includes("masdar-city-about")) return `${area.name} is included for people comparing an innovation-district base with source-backed workspace context.`;
  if (area.sourceIds.includes("cloudspaces-yas")) return `${area.name} is useful when the plan needs a named workspace provider on Yas plus housing checks from separate sources.`;
  if (areaSources.some((source) => source.id === "adrec-rental-index")) return `${area.name} can be used as a housing search area, with ADREC rental-index context before individual listings are ranked.`;
  return `${area.name} is available as a planning area once source-backed homes or work actions match your profile.`;
}
function practicalHighlights(area: CatalogArea, areaSources: CatalogSource[]) { const items = []; if (areaSources.some((source) => source.kind === "government" || source.kind === "regulator")) items.push("Official source context is available for planning checks."); if (area.sourceIds.includes("adrec-rental-index")) items.push("Use ADREC rental-index context as a benchmark, not as a live listing."); if (area.sourceIds.includes("wework-hub71")) items.push("Hub71 workspace handoff is source-linked for work planning."); if (area.sourceIds.some((id) => id.includes("cloudspaces"))) items.push("Cloud Spaces provider pages can be opened and recorded as opened only."); if (area.sourceIds.includes("adgm-office-space")) items.push("ADGM office-space context supports company setup planning."); return items.length ? items : ["Use as a preferred area before Yala AD filters homes by budget and policy."]; }
function practicalActions(area: CatalogArea, areaSources: CatalogSource[]) { const actions = ["Save as a preferred area in your private move plan.", "Review homes only after affordability and company allowance filters pass."]; if (areaSources.some((source) => source.url)) actions.push("Open source pages from the guide footer when you need to verify context."); return actions; }
function bestFor(area: CatalogArea) { const fit = []; if (area.sourceIds.some((id) => id.includes("adgm") || id.includes("hub71"))) fit.push("ADGM or Hub71-linked work planning"); if (area.sourceIds.some((id) => id.includes("cloudspaces"))) fit.push("serviced-office exploration"); if (area.sourceIds.includes("adrec-rental-index")) fit.push("early housing budget comparison"); if (area.sourceIds.includes("masdar-city-about")) fit.push("innovation-district research"); return fit.length ? fit : ["private relocation planning"]; }
function caveats(area: CatalogArea, areaSources: CatalogSource[]) { const notes = ["No commute, school, amenity or rent-level claim is inferred without a dated source."]; if (areaSources.some((source) => source.id === "adrec-rental-index")) notes.push("ADREC rental index is a benchmark guide, not a legal rent value or live unit listing."); return notes; }
