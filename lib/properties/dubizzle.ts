const DEFAULT_SOURCE_URL = "https://abudhabi.dubizzle.com/en/property-for-rent/residential/";
const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 60;

export type RentalListing = {
  id: string;
  title: string;
  area: string;
  location: string;
  annualRentAed: number;
  bedrooms: number;
  bathrooms: number | null;
  sizeSqft: number | null;
  url: string;
  source: "dubizzle";
  fetchedAt: string;
  synthetic: false;
  provenance: {
    sourceUrl: string;
    parser: "dubizzle-public-html";
  };
};

export type DubizzlePullErrorCode = "HTTP_ERROR" | "BLOCKED" | "PARSE_EMPTY" | "NETWORK_ERROR";

export type DubizzlePullResult = {
  ok: boolean;
  listings: RentalListing[];
  fetchedAt: string;
  sourceUrl: string;
  requestCount: number;
  blocked: boolean;
  warnings: string[];
  error?: {
    code: DubizzlePullErrorCode;
    message: string;
    status?: number;
  };
};

export type FetchDubizzleRentalsOptions = {
  limit?: number;
  sourceUrl?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
};

type AnchorCandidate = {
  href: string;
  text: string;
};

type ParsedCandidate = {
  title: string;
  area: string;
  location: string;
  annualRentAed: number;
  bedrooms: number;
  bathrooms: number | null;
  sizeSqft: number | null;
  urlPath: string;
};

export async function fetchDubizzleRentals(
  limitOrOptions: number | FetchDubizzleRentalsOptions = DEFAULT_LIMIT,
): Promise<RentalListing[]> {
  const result = await pullDubizzleRentals(
    typeof limitOrOptions === "number" ? { limit: limitOrOptions } : limitOrOptions,
  );

  return result.listings;
}

export async function pullDubizzleRentals(
  options: FetchDubizzleRentalsOptions = {},
): Promise<DubizzlePullResult> {
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
    const blocked = isChallengePage(html);

    if (!response.ok) {
      return buildErrorResult({
        sourceUrl,
        fetchedAt,
        blocked,
        status: response.status,
        code: "HTTP_ERROR",
        message: `Dubizzle returned HTTP ${response.status}.`,
      });
    }

    if (blocked) {
      return buildErrorResult({
        sourceUrl,
        fetchedAt,
        blocked: true,
        code: "BLOCKED",
        message:
          "Dubizzle returned an anti-bot interstitial instead of listing HTML. No bypass was attempted.",
      });
    }

    const listings = parseDubizzleRentalsFromHtml(html, { sourceUrl, fetchedAt, limit });

    if (listings.length === 0) {
      return buildErrorResult({
        sourceUrl,
        fetchedAt,
        blocked: false,
        code: "PARSE_EMPTY",
        message: "Dubizzle returned HTML, but no rental listings matched the public parser.",
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
      code: "NETWORK_ERROR",
      message: error instanceof Error ? error.message : "Unknown network error while fetching Dubizzle.",
    });
  } finally {
    clearTimeout(timeout);
  }
}

export function parseDubizzleRentalsFromHtml(
  html: string,
  options: { sourceUrl?: string; fetchedAt?: string; limit?: number } = {},
): RentalListing[] {
  const sourceUrl = options.sourceUrl ?? DEFAULT_SOURCE_URL;
  const fetchedAt = options.fetchedAt ?? new Date().toISOString();
  const limit = clampLimit(options.limit);
  const knownAreas = extractKnownAreas(html);
  const anchors = extractAnchors(html);
  const candidates =
    anchors.length > 0
      ? anchors.flatMap((anchor) => parseCandidateText(anchor.text, anchor.href, knownAreas))
      : parseCandidateText(htmlToText(html), "", knownAreas);

  return dedupeListings(candidates)
    .slice(0, limit)
    .map((candidate) => normalizeListing(candidate, sourceUrl, fetchedAt));
}

function parseCandidateText(text: string, href: string, knownAreas: string[]): ParsedCandidate[] {
  const normalized = normalizeText(text);
  const matches = Array.from(
    normalized.matchAll(
      /(?:verified\s+)?AED\s*([\d,]+)\s*(Yearly|Monthly|Weekly|Daily)\s+(.+?)\s+(Studio|\d+\s*Beds?|\d+\s*Bed)\s+(\d+\s*Baths?|\d+\s*Bath)?\s*([\d,]+)\s*sqft\s+(.+?)(?=\s+(?:Email\s+)?Call(?:\s+WhatsApp)?(?:\s+PREMIUM)?|$)/gi,
    ),
  );

  return matches.flatMap((match) => {
    const rent = toInteger(match[1]);
    const frequency = match[2].toLowerCase();
    const annualRentAed = toAnnualRent(rent, frequency);
    const titlePrefix = titleCase(match[3].trim());
    const bedrooms = match[4].toLowerCase().startsWith("studio") ? 0 : toInteger(match[4]);
    const bathrooms = match[5] ? toInteger(match[5]) : null;
    const sizeSqft = toInteger(match[6]);
    const titleAndLocation = titleCase(match[7].trim());
    const { title, area, location } = splitTitleAndLocation(titleAndLocation, knownAreas);

    if (annualRentAed <= 0 || !titleAndLocation) {
      return [];
    }

    return [
      {
        title: title || titlePrefix,
        area,
        location,
        annualRentAed,
        bedrooms,
        bathrooms,
        sizeSqft: sizeSqft || null,
        urlPath: href,
      },
    ];
  });
}

function splitTitleAndLocation(
  text: string,
  knownAreas: string[],
): { title: string; area: string; location: string } {
  const areaMatch = knownAreas
    .sort((a, b) => b.length - a.length)
    .find((area) => new RegExp(`\\b${escapeRegExp(area)}\\b`, "i").test(text));

  if (areaMatch) {
    const index = text.toLowerCase().lastIndexOf(areaMatch.toLowerCase());
    const title = text.slice(0, index).replace(/[,\s]+$/, "").trim();
    const location = text.slice(index).trim();
    return {
      title: title || text,
      area: areaMatch,
      location: ensureAbuDhabi(location),
    };
  }

  const abuDhabiIndex = text.toLowerCase().lastIndexOf(", abu dhabi");
  if (abuDhabiIndex > 0) {
    const beforeCity = text.slice(0, abuDhabiIndex);
    const previousComma = beforeCity.lastIndexOf(",");
    if (previousComma > 0) {
      const area = beforeCity.slice(previousComma + 1).trim();
      return {
        title: beforeCity.slice(0, previousComma).trim() || text,
        area,
        location: ensureAbuDhabi(`${area}, Abu Dhabi`),
      };
    }
  }

  return {
    title: text,
    area: "Abu Dhabi",
    location: "Abu Dhabi",
  };
}

function extractKnownAreas(html: string): string[] {
  const text = htmlToText(html);
  const areas = Array.from(text.matchAll(/\b([A-Z][A-Za-z0-9 '&.-]{2,80})\(([\d,]+)\)/g))
    .map((match) => titleCase(match[1].trim()))
    .filter((area) => !["Popular", "Residential", "Commercial"].includes(area));

  return Array.from(new Set([...areas, ...fallbackAreas()]));
}

function fallbackAreas(): string[] {
  return [
    "Al Reem Island",
    "Khalifa City",
    "Saadiyat Island",
    "Yas Island",
    "Al Raha Beach",
    "Mohammed Bin Zayed City",
    "Al Khalidiyah",
    "Corniche Area",
    "Al Maryah Island",
    "Masdar City",
    "Al Reef",
    "Al Mushrif",
    "Baniyas",
    "Al Muroor",
    "Al Nahyan",
  ];
}

function extractAnchors(html: string): AnchorCandidate[] {
  return Array.from(
    html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi),
  )
    .map((match) => ({
      href: decodeHtml(match[1]),
      text: htmlToText(match[2]),
    }))
    .filter(
      (anchor) =>
        /property-for-rent|rent/i.test(anchor.href) &&
        /\bAED\b/i.test(anchor.text) &&
        /\bsqft\b/i.test(anchor.text),
    );
}

function normalizeListing(
  candidate: ParsedCandidate,
  sourceUrl: string,
  fetchedAt: string,
): RentalListing {
  const absoluteUrl = toAbsoluteUrl(candidate.urlPath, sourceUrl);
  return {
    id: makeStableId(candidate, absoluteUrl),
    title: candidate.title,
    area: candidate.area,
    location: candidate.location,
    annualRentAed: candidate.annualRentAed,
    bedrooms: candidate.bedrooms,
    bathrooms: candidate.bathrooms,
    sizeSqft: candidate.sizeSqft,
    url: absoluteUrl,
    source: "dubizzle",
    fetchedAt,
    synthetic: false,
    provenance: {
      sourceUrl,
      parser: "dubizzle-public-html",
    },
  };
}

function dedupeListings(candidates: ParsedCandidate[]): ParsedCandidate[] {
  const seen = new Set<string>();
  const unique: ParsedCandidate[] = [];

  for (const candidate of candidates) {
    const key = `${candidate.urlPath}|${candidate.annualRentAed}|${candidate.title}|${candidate.location}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(candidate);
    }
  }

  return unique;
}

function buildErrorResult(input: {
  sourceUrl: string;
  fetchedAt: string;
  blocked: boolean;
  code: DubizzlePullErrorCode;
  message: string;
  status?: number;
}): DubizzlePullResult {
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

function isChallengePage(html: string): boolean {
  return /Pardon Our Interruption|initializeProtection|_Incapsula_Resource|Imperva/i.test(html);
}

function htmlToText(html: string): string {
  return normalizeText(
    decodeHtml(
      html
        .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
        .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " "),
    ),
  );
}

function normalizeText(text: string): string {
  return decodeHtml(text).replace(/\s+/g, " ").trim();
}

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function toAnnualRent(amount: number, frequency: string): number {
  if (frequency === "monthly") {
    return amount * 12;
  }
  if (frequency === "weekly") {
    return amount * 52;
  }
  if (frequency === "daily") {
    return amount * 365;
  }
  return amount;
}

function toInteger(value: string): number {
  const parsed = Number.parseInt(value.replace(/[^\d]/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : 0;
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

function makeStableId(candidate: ParsedCandidate, absoluteUrl: string): string {
  const seed = absoluteUrl.endsWith("/residential/") ? JSON.stringify(candidate) : absoluteUrl;
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }

  return `dubizzle-${hash.toString(36)}`;
}

function ensureAbuDhabi(location: string): string {
  return /abu dhabi/i.test(location) ? location : `${location}, Abu Dhabi`;
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .replace(/\bUae\b/g, "UAE")
    .replace(/\bAed\b/g, "AED");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
