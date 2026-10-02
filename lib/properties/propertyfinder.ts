const DEFAULT_SOURCE_URL = "https://www.propertyfinder.ae/en/rent/abu-dhabi/properties-for-rent.html";
const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 60;

export type PropertyFinderRentalListing = {
  id: string;
  title: string;
  area: string;
  location: string;
  annualRentAed: number;
  bedrooms: number;
  bathrooms: number | null;
  sizeSqft: number | null;
  url: string;
  source: "propertyfinder";
  fetchedAt: string;
  synthetic: false;
  listedDate?: string;
  provenance: {
    sourceUrl: string;
    parser: "propertyfinder-next-data";
  };
};

export type PropertyFinderPullErrorCode =
  | "HTTP_ERROR"
  | "BLOCKED"
  | "PARSE_EMPTY"
  | "PARSE_ERROR"
  | "NETWORK_ERROR";

export type PropertyFinderPullResult = {
  ok: boolean;
  listings: PropertyFinderRentalListing[];
  fetchedAt: string;
  sourceUrl: string;
  requestCount: number;
  blocked: boolean;
  warnings: string[];
  error?: {
    code: PropertyFinderPullErrorCode;
    message: string;
    status?: number;
  };
};

export type FetchPropertyFinderRentalsOptions = {
  limit?: number;
  sourceUrl?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
};

type JsonRecord = Record<string, unknown>;

export async function fetchPropertyFinderRentals(
  limitOrOptions: number | FetchPropertyFinderRentalsOptions = DEFAULT_LIMIT,
): Promise<PropertyFinderRentalListing[]> {
  const result = await pullPropertyFinderRentals(
    typeof limitOrOptions === "number" ? { limit: limitOrOptions } : limitOrOptions,
  );

  return result.listings;
}

export async function pullPropertyFinderRentals(
  options: FetchPropertyFinderRentalsOptions = {},
): Promise<PropertyFinderPullResult> {
  const sourceUrl = options.sourceUrl ?? DEFAULT_SOURCE_URL;
  const limit = clampLimit(options.limit);
  const fetchedAt = new Date().toISOString();
  const fetchImpl = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 12_000);

  try {
    const response = await fetchImpl(sourceUrl, {
      signal: controller.signal,
      headers: {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9",
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36",
      },
    });

    const html = await response.text();
    const blocked = isBlockedPage(html);

    if (!response.ok) {
      return buildErrorResult({
        sourceUrl,
        fetchedAt,
        blocked,
        status: response.status,
        code: "HTTP_ERROR",
        message: `Property Finder returned HTTP ${response.status}.`,
      });
    }

    if (blocked) {
      return buildErrorResult({
        sourceUrl,
        fetchedAt,
        blocked: true,
        code: "BLOCKED",
        message:
          "Property Finder returned a challenge page without embedded listing data. No bypass was attempted.",
      });
    }

    const listings = parsePropertyFinderRentalsFromHtml(html, { sourceUrl, fetchedAt, limit });

    if (listings.length === 0) {
      return buildErrorResult({
        sourceUrl,
        fetchedAt,
        blocked: false,
        code: "PARSE_EMPTY",
        message: "Property Finder returned HTML, but no rental listings matched the parser.",
      });
    }

    return {
      ok: true,
      listings,
      fetchedAt,
      sourceUrl,
      requestCount: 1,
      blocked: false,
      warnings: [],
    };
  } catch (error) {
    return buildErrorResult({
      sourceUrl,
      fetchedAt,
      blocked: false,
      code: error instanceof SyntaxError ? "PARSE_ERROR" : "NETWORK_ERROR",
      message:
        error instanceof Error
          ? error.message
          : "Unknown error while fetching Property Finder listings.",
    });
  } finally {
    clearTimeout(timeout);
  }
}

export function parsePropertyFinderRentalsFromHtml(
  html: string,
  options: { sourceUrl?: string; fetchedAt?: string; limit?: number } = {},
): PropertyFinderRentalListing[] {
  const sourceUrl = options.sourceUrl ?? DEFAULT_SOURCE_URL;
  const fetchedAt = options.fetchedAt ?? new Date().toISOString();
  const limit = clampLimit(options.limit);
  const payload = extractNextData(html);
  const listings = readListings(payload);

  return listings
    .flatMap((item) => normalizeListing(item, sourceUrl, fetchedAt))
    .slice(0, limit);
}

function extractNextData(html: string): JsonRecord {
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);

  if (!match) {
    throw new SyntaxError("Missing Property Finder __NEXT_DATA__ payload.");
  }

  const parsed: unknown = JSON.parse(decodeHtml(match[1]));
  if (!isRecord(parsed)) {
    throw new SyntaxError("Property Finder __NEXT_DATA__ payload is not an object.");
  }

  return parsed;
}

function readListings(payload: JsonRecord): JsonRecord[] {
  const listings = getPath(payload, ["props", "pageProps", "searchResult", "listings"]);
  return Array.isArray(listings) ? listings.filter(isRecord) : [];
}

function normalizeListing(
  item: JsonRecord,
  sourceUrl: string,
  fetchedAt: string,
): PropertyFinderRentalListing[] {
  if (item.listing_type !== "property") {
    return [];
  }

  const property = item.property;
  if (!isRecord(property)) {
    return [];
  }

  if (typeof property.category_id === "number" && property.category_id !== 2) {
    return [];
  }

  const price = property.price;
  if (!isRecord(price) || price.currency !== "AED" || price.is_hidden === true) {
    return [];
  }

  const period = typeof price.period === "string" ? price.period.toLowerCase() : "";
  if (!["yearly", "monthly", "weekly", "daily"].includes(period)) {
    return [];
  }
  const priceValue = toNumber(price.value);
  const annualRentAed = toAnnualRent(priceValue, period);
  const shareUrl = typeof property.share_url === "string" ? property.share_url : "";
  const listingUrl = toAbsoluteUrl(shareUrl, sourceUrl);
  const bedrooms = parseRoomCount(property.bedrooms);

  if (
    annualRentAed <= 0 ||
    bedrooms === null ||
    !listingUrl.startsWith("https://www.propertyfinder.ae/en/plp/rent/")
  ) {
    return [];
  }

  const location = isRecord(property.location) ? property.location : {};
  const locationTree = Array.isArray(property.location_tree)
    ? property.location_tree.filter(isRecord)
    : [];
  const title = typeof property.title === "string" ? property.title.trim() : "Property Finder rental";
  const id = typeof property.id === "string" ? property.id : makeStableId(shareUrl || title);
  const fullLocation =
    typeof location.full_name === "string" ? location.full_name.trim() : fallbackLocation(locationTree);
  const area = readArea(locationTree, fullLocation);
  const listedDate = typeof property.listed_date === "string" ? property.listed_date : undefined;

  return [
    {
      id: `propertyfinder-${id}`,
      title,
      area,
      location: fullLocation || area,
      annualRentAed,
      bedrooms,
      bathrooms: parseRoomCount(property.bathrooms),
      sizeSqft: parseSizeSqft(property.size),
      url: listingUrl,
      source: "propertyfinder",
      fetchedAt,
      synthetic: false,
      listedDate,
      provenance: {
        sourceUrl,
        parser: "propertyfinder-next-data",
      },
    },
  ];
}

function readArea(locationTree: JsonRecord[], fullLocation: string): string {
  const community = locationTree[1];
  if (isRecord(community) && typeof community.name === "string") {
    return community.name === "Al Khalidiya" ? "Al Khalidiyah" : community.name;
  }

  const parts = fullLocation.split(",").map((part) => part.trim()).filter(Boolean);
  return parts.length > 1 ? parts.at(-2) ?? "Abu Dhabi" : "Abu Dhabi";
}

function fallbackLocation(locationTree: JsonRecord[]): string {
  const names = locationTree
    .map((node) => node.name)
    .filter((name): name is string => typeof name === "string");

  return names.length > 0 ? names.reverse().join(", ") : "Abu Dhabi";
}

function parseRoomCount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  if (value.toLowerCase() === "studio") {
    return 0;
  }

  const parsed = Number.parseInt(value.replace(/[^\d]/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseSizeSqft(size: unknown): number | null {
  if (!isRecord(size)) {
    return null;
  }

  const value = toNumber(size.value);
  if (value <= 0) {
    return null;
  }

  const unit = typeof size.unit === "string" ? size.unit.toLowerCase() : "sqft";
  if (unit === "sqm" || unit === "m2") {
    return Math.round(value * 10.7639);
  }

  return Math.round(value);
}

function toAnnualRent(amount: number, period: string): number {
  if (period === "monthly") {
    return amount * 12;
  }
  if (period === "weekly") {
    return amount * 52;
  }
  if (period === "daily") {
    return amount * 365;
  }
  return amount;
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.replace(/[^\d.]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function buildErrorResult(input: {
  sourceUrl: string;
  fetchedAt: string;
  blocked: boolean;
  code: PropertyFinderPullErrorCode;
  message: string;
  status?: number;
}): PropertyFinderPullResult {
  return {
    ok: false,
    listings: [],
    fetchedAt: input.fetchedAt,
    sourceUrl: input.sourceUrl,
    requestCount: 1,
    blocked: input.blocked,
    warnings: [input.message],
    error: {
      code: input.code,
      message: input.message,
      status: input.status,
    },
  };
}

function isBlockedPage(html: string): boolean {
  return !html.includes("__NEXT_DATA__") && /captcha|challenge|aws-waf|blocked/i.test(html);
}

function clampLimit(limit = DEFAULT_LIMIT): number {
  if (!Number.isFinite(limit)) {
    return DEFAULT_LIMIT;
  }
  return Math.max(1, Math.min(Math.trunc(limit), MAX_LIMIT));
}

function toAbsoluteUrl(path: string, sourceUrl: string): string {
  if (!path) {
    return sourceUrl;
  }

  try {
    return new URL(path, sourceUrl).toString();
  } catch {
    return sourceUrl;
  }
}

function makeStableId(seed: string): string {
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }

  return hash.toString(36);
}

function getPath(record: JsonRecord, path: string[]): unknown {
  let current: unknown = record;

  for (const segment of path) {
    if (!isRecord(current)) {
      return undefined;
    }
    current = current[segment];
  }

  return current;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function decodeHtml(value: string): string {
  return value
    .replace(/&quot;/gi, '"')
    .replace(/&#x27;/gi, "'")
    .replace(/&#39;/gi, "'")
    .replace(/&amp;/gi, "&");
}
