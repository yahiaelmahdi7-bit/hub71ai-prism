import calibration from "../../data/property-calibration.json" with { type: "json" };
import snapshot from "../../data/property-snapshot.json" with { type: "json" };
import type { RentalHome, SourceRecord } from "../types.ts";

type SnapshotSource = {
  id: string;
  title: string;
  publisher: string;
  url: string;
  kind: "property_portal";
  checkedAt: string;
  verification: "page_opened" | "search_only" | "access_blocked";
  supportedClaims: string[];
  limitations: string[];
  observedPrice?: {
    amountAed: number;
    period: string;
    annualizedAed: number;
    note: string;
  };
};

type SnapshotHome = {
  id: string;
  sourceId: string;
  title: string;
  area: string;
  areaId: string;
  location: string;
  annualRentAed: number;
  bedrooms: number;
  bathrooms: number | null;
  sizeSqft: number | null;
  source: "dubizzle" | "propertyfinder";
  listingUrl: string | null;
  contactable?: boolean;
  availability?: "unconfirmed" | "illustrative";
  normalizationNote?: string;
  imageUrl?: string;
  imageAlt?: string;
  imageSourceUrl?: string;
};

export type RentalCatalog = {
  version: string;
  checkedAt: string;
  snapshot: RentalHome[];
  synthetic: RentalHome[];
  sources: SourceRecord[];
  limitations: string[];
};

export function getRentalCatalog(): RentalCatalog {
  const snapshotHomes = (snapshot.homes as SnapshotHome[]).map(normalizeSnapshotHome);
  const syntheticHomes = calibration.bands.flatMap((band, bandIndex) =>
    [0.3, 0.7].map((position, variant) => {
      const bedrooms = Number(band.bedrooms);
      const annualRentAed = roundTo(
        Number(band.minRentAed) + (Number(band.maxRentAed) - Number(band.minRentAed)) * position,
        500,
      );

      return {
        id: `synthetic-${bandIndex + 1}-${variant + 1}`,
        title: `Illustrative ${bedrooms === 0 ? "studio" : `${bedrooms}-bedroom home`} in ${band.area}`,
        area: String(band.area),
        areaId: toAreaId(String(band.area)),
        annualRentAed,
        bedrooms,
        bathrooms: bedrooms === 0 ? 1 : bedrooms,
        sizeSqft: roundTo(
          Number(band.minSqft) + (Number(band.maxSqft) - Number(band.minSqft)) * position,
          25,
        ),
        synthetic: true,
        source: "synthetic",
        sourceUrl: null,
        listingUrl: null,
        checkedAt: String(calibration.asOf),
        sourceKind: "synthetic",
        contactable: false,
        availability: "illustrative",
      } satisfies RentalHome;
    }),
  );

  return {
    version: String(snapshot.version),
    checkedAt: String(snapshot.checkedAt),
    snapshot: snapshotHomes,
    synthetic: syntheticHomes,
    sources: (snapshot.sources as SnapshotSource[]).map(normalizeSource),
    limitations: Array.isArray(snapshot.limitations) ? snapshot.limitations.map(String) : [],
  };
}

export function toAreaId(area: string): string {
  return area
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeSnapshotHome(home: SnapshotHome): RentalHome {
  const source = (snapshot.sources as SnapshotSource[]).find((item) => item.id === home.sourceId);
  const areaId = home.areaId || toAreaId(home.area);

  assertAbuDhabiHome(home);

  return {
    id: home.id,
    title: home.title,
    area: home.area,
    areaId,
    annualRentAed: home.annualRentAed,
    bedrooms: home.bedrooms,
    bathrooms: home.bathrooms,
    sizeSqft: home.sizeSqft,
    synthetic: false,
    source: home.source,
    sourceUrl: source?.url ?? home.listingUrl,
    listingUrl: home.listingUrl,
    checkedAt: source?.checkedAt ?? String(snapshot.checkedAt),
    sourceKind: "snapshot",
    contactable: Boolean(home.listingUrl) && home.contactable !== false && source?.verification === "page_opened",
    availability: home.availability ?? "unconfirmed",
    imageUrl: validListingImage(home.imageUrl),
    imageAlt: home.imageUrl ? home.imageAlt ?? `${home.title} listing image` : undefined,
    imageSourceUrl: home.imageUrl ? home.imageSourceUrl ?? source?.url ?? home.listingUrl ?? undefined : undefined,
  };
}

function normalizeSource(source: SnapshotSource): SourceRecord {
  return {
    id: source.id,
    title: source.title,
    publisher: source.publisher,
    url: source.url,
    kind: source.kind,
    checkedAt: source.checkedAt,
    confidence: "medium",
    verification: source.verification,
    supportedClaims: source.supportedClaims,
    limitations: source.observedPrice
      ? [...source.limitations, `Observed price: AED ${source.observedPrice.amountAed.toLocaleString("en-US")} ${source.observedPrice.period}; annualized AED ${source.observedPrice.annualizedAed.toLocaleString("en-US")}. ${source.observedPrice.note}`]
      : source.limitations,
  };
}

function assertAbuDhabiHome(home: SnapshotHome) {
  if (!home.location.toLowerCase().includes("abu dhabi")) {
    throw new Error(`Snapshot home ${home.id} must include Abu Dhabi in its location.`);
  }
  if (home.areaId !== toAreaId(home.area)) {
    throw new Error(`Snapshot home ${home.id} areaId must be ${toAreaId(home.area)}.`);
  }
  if (!Number.isFinite(home.annualRentAed) || home.annualRentAed <= 0) {
    throw new Error(`Snapshot home ${home.id} must have a positive annual rent.`);
  }
  const source = (snapshot.sources as SnapshotSource[]).find((item) => item.id === home.sourceId);
  if (source?.verification !== "page_opened" && home.contactable === true) {
    throw new Error(`Snapshot home ${home.id} cannot be contactable unless its source is an opened page.`);
  }
  if (source?.verification !== "page_opened" && home.listingUrl !== null) {
    throw new Error(`Snapshot home ${home.id} cannot expose a listing URL unless its source is an opened page.`);
  }
  if (home.imageUrl && !home.imageSourceUrl) {
    throw new Error(`Snapshot home ${home.id} imageSourceUrl is required when imageUrl is present.`);
  }
  if (home.imageUrl && !source?.url) {
    throw new Error(`Snapshot home ${home.id} image must be tied to a source URL.`);
  }
}

function validListingImage(value: string | undefined) {
  if (!value) return undefined;
  if (!value.startsWith("https://static.shared.propertyfinder.ae/") && !value.startsWith("https://dbz-images.dubizzle.com/")) {
    throw new Error(`Listing image must come from the original opened portal media host: ${value}`);
  }
  return value;
}

function roundTo(value: number, step: number) {
  return Math.round(value / step) * step;
}
