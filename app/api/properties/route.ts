import { pullDubizzleRentals, type DubizzlePullResult } from "../../../lib/properties/dubizzle.ts";
import {
  pullPropertyFinderRentals,
  type PropertyFinderPullResult,
} from "../../../lib/properties/propertyfinder.ts";
import { getRentalCatalog } from "../../../lib/properties/catalog.ts";
import { getPropertyCalibration, getSyntheticRentals } from "../../../lib/synthetic-properties.ts";

export const runtime = "nodejs";

const CACHE_MS = 10 * 60 * 1000;
type LivePullResult = DubizzlePullResult | PropertyFinderPullResult;
type LiveResult = {
  selected: LivePullResult;
  attempts: { dubizzle: DubizzlePullResult; propertyfinder?: PropertyFinderPullResult };
};
let cached: { expiresAt: number; result: LiveResult } | null = null;
let pending: Promise<LiveResult> | null = null;

async function getLiveRentals(): Promise<LiveResult> {
  if (cached && cached.expiresAt > Date.now()) return cached.result;
  if (pending) return pending;

  pending = (async () => {
    const dubizzle = await pullDubizzleRentals({ limit: 60, timeoutMs: 3_000 });
    if (dubizzle.ok) return { selected: dubizzle, attempts: { dubizzle } };
    const propertyfinder = await pullPropertyFinderRentals({ limit: 60 });
    return {
      selected: propertyfinder,
      attempts: { dubizzle, propertyfinder },
    };
  })();
  try {
    const result = await pending;
    cached = { result, expiresAt: Date.now() + (result.selected.ok ? CACHE_MS : 30_000) };
    return result;
  } finally {
    pending = null;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("mode") ?? "both";
  if (!new Set(["snapshot", "synthetic", "both", "live-diagnostic", "live"]).has(mode)) {
    return Response.json(
      { error: "mode must be snapshot, synthetic, both, or live-diagnostic" },
      { status: 400 },
    );
  }

  const limitValue = Number(url.searchParams.get("limit") ?? 24);
  if (!Number.isInteger(limitValue) || limitValue < 1 || limitValue > 60) {
    return Response.json({ error: "limit must be an integer from 1 to 60" }, { status: 400 });
  }

  if (mode === "live" || mode === "live-diagnostic") {
    const live = await getLiveRentals();
    return Response.json(
      {
        liveDiagnostic: { ...live.selected, listings: live.selected.listings.slice(0, limitValue) },
        sourceAttempts: Object.entries(live.attempts).map(([source, attempt]) => ({
          source,
          ok: attempt.ok,
          blocked: attempt.blocked,
          fetchedAt: attempt.fetchedAt,
          requestCount: attempt.requestCount,
          error: attempt.error,
        })),
        warning:
          "Live portal pulls are diagnostics only. The default catalog uses a manually curated dated snapshot because portal terms prohibit automated database building.",
      },
      {
        status: live.selected.ok ? 200 : 502,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  const catalog = getRentalCatalog();
  const synthetic = mode === "snapshot" ? [] : catalog.synthetic.slice(0, limitValue);
  const snapshotHomes = mode === "synthetic" ? [] : catalog.snapshot.slice(0, limitValue);
  const payload = {
    snapshot: {
      ok: true,
      sourceKind: "snapshot",
      checkedAt: catalog.checkedAt,
      listings: snapshotHomes,
      limitations: catalog.limitations,
    },
    sourceAttempts: [],
    synthetic,
    calibration: getPropertyCalibration(),
    sources: catalog.sources,
    legacySynthetic: mode === "snapshot" ? [] : getSyntheticRentals().slice(0, limitValue),
  };

  return Response.json(payload, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
