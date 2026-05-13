import { and, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { yahooFetcher } from "./yahoo";
import { finnhubFetcher } from "./finnhub";
import { massiveFetcher } from "./massive";
import { finnhubAvailable } from "@/lib/finnhub/client";
import { massiveAvailable } from "@/lib/massive/client";
import type { Quote, QuoteAssetKind } from "./types";

/**
 * Live quote cache TTL — per-provider.
 *   Intraday providers (Yahoo, Finnhub): 5 min so toggling the dashboard
 *     during market hours still feels live.
 *   Polygon free tier: end-of-day only, refresh once a day.
 */
function ttlFor(provider: string): number {
  if (provider === "polygon") return 12 * 60 * 60 * 1000;
  return 5 * 60 * 1000;
}

/**
 * Max number of Polygon (Massive) calls a single page-load is willing to
 * burn waiting on. Free tier is 5/min with a 12-second min interval, so
 * 2 calls = ~24s of throttling worst case. The cap keeps page loads snappy;
 * stale entries past this budget fall back to broker prices this round and
 * fill in on subsequent visits (12h TTL means 4-8 visits per day fully
 * warms a 16-position option chain).
 */
const MAX_POLYGON_PER_REQUEST = 2;

export type LiveQuote = {
  instrumentId: number;
  symbol: string;
  price: number;
  currency: string;
  dayChangePct: number | null;
  provider: "yahoo" | "finnhub" | "polygon";
  fetchedAt: Date;
};

type Target = {
  instrumentId: number;
  symbol: string;
  exchange: string;
  kind: QuoteAssetKind;
  brokerCurrency?: string;
};

/**
 * Returns live quotes for a batch of instruments. Reads the `live_quotes`
 * DB cache first; for instruments whose cached row is older than TTL (or
 * missing), fetches Yahoo → Finnhub → Polygon (for options) and upserts.
 *
 * - Stocks/ETFs/Crypto: Yahoo first, Finnhub fallback.
 * - Options: Polygon only (Yahoo + Finnhub return null).
 * - Currency-mismatch guard rejects wrong-listing matches.
 */
export async function batchLiveQuotes(
  targets: Target[],
): Promise<Map<number, LiveQuote>> {
  const out = new Map<number, LiveQuote>();
  if (targets.length === 0) return out;

  const ids = targets.map((t) => t.instrumentId);
  const cached = await db()
    .select()
    .from(schema.liveQuotes)
    .where(inArray(schema.liveQuotes.instrumentId, ids));
  const cacheMap = new Map(cached.map((r) => [r.instrumentId, r]));

  const now = Date.now();
  const stale: Target[] = [];
  for (const t of targets) {
    const c = cacheMap.get(t.instrumentId);
    if (c && now - c.fetchedAt.getTime() < ttlFor(c.provider)) {
      out.set(t.instrumentId, {
        instrumentId: t.instrumentId,
        symbol: t.symbol,
        price: parseFloat(c.price),
        currency: c.currency,
        dayChangePct:
          c.dayChangePct != null ? parseFloat(c.dayChangePct) : null,
        provider: c.provider as "yahoo" | "finnhub" | "polygon",
        fetchedAt: c.fetchedAt,
      });
    } else {
      stale.push(t);
    }
  }
  if (stale.length === 0) return out;

  const finnhub = finnhubAvailable();
  const massive = massiveAvailable();

  // Awaited fetches: Yahoo + Finnhub for non-options. Both are free + fast
  // (no throttle delays at our volume). Polygon is NOT used here even as a
  // fallback — its 12s throttle would push page load past 1min if anything
  // falls through.
  const staleOther = stale.filter((t) => t.kind !== "option");
  await Promise.all(
    staleOther.map(async (t) => {
      let q: Quote | null = null;
      try {
        q = await yahooFetcher.fetch({
          symbol: t.symbol,
          exchange: t.exchange,
          kind: t.kind,
        });
      } catch {}
      if (!q && finnhub) {
        try {
          q = await finnhubFetcher.fetch({
            symbol: t.symbol,
            exchange: t.exchange,
            kind: t.kind,
          });
        } catch {}
      }
      if (!q) return;
      if (t.brokerCurrency && q.currency !== t.brokerCurrency) return;
      await persist(t, q, out);
    }),
  );

  // Options pricing intentionally never runs during a page request — the
  // 12s/call throttle on Polygon free tier would dominate latency. Use the
  // `/api/quotes/options/refresh` route to populate the cache; subsequent
  // page loads then serve live option prices from `live_quotes`.

  return out;
}

/**
 * Refresh all stale option quotes for a snapshot's holdings, throttled
 * appropriately. Designed to be called from a dedicated route (manual or
 * scheduled), NOT from a page render.
 */
export async function refreshOptionsForHoldings(
  optionTargets: Target[],
): Promise<{ refreshed: number; skipped: number }> {
  if (!massiveAvailable() || optionTargets.length === 0) {
    return { refreshed: 0, skipped: optionTargets.length };
  }
  const ids = optionTargets.map((t) => t.instrumentId);
  const cached = await db()
    .select()
    .from(schema.liveQuotes)
    .where(inArray(schema.liveQuotes.instrumentId, ids));
  const cacheMap = new Map(cached.map((r) => [r.instrumentId, r]));
  const now = Date.now();
  let refreshed = 0;
  let skipped = 0;
  for (const t of optionTargets) {
    const c = cacheMap.get(t.instrumentId);
    if (c && now - c.fetchedAt.getTime() < ttlFor(c.provider)) {
      skipped++;
      continue;
    }
    try {
      const q = await massiveFetcher.fetch({
        symbol: t.symbol,
        exchange: t.exchange,
        kind: t.kind,
      });
      if (q) {
        await persist(t, q, new Map());
        refreshed++;
      }
    } catch {}
  }
  return { refreshed, skipped };
}

async function persist(
  t: Target,
  q: Quote,
  out: Map<number, LiveQuote>,
): Promise<void> {
  const lq: LiveQuote = {
    instrumentId: t.instrumentId,
    symbol: t.symbol,
    price: q.price,
    currency: q.currency,
    dayChangePct: q.dayChangePct,
    provider: q.provider as "yahoo" | "finnhub" | "polygon",
    fetchedAt: new Date(),
  };
  out.set(t.instrumentId, lq);
  try {
    await db()
      .insert(schema.liveQuotes)
      .values({
        instrumentId: lq.instrumentId,
        price: lq.price.toString(),
        currency: lq.currency,
        dayChangePct:
          lq.dayChangePct != null ? lq.dayChangePct.toString() : null,
        provider: lq.provider,
      })
      .onConflictDoUpdate({
        target: schema.liveQuotes.instrumentId,
        set: {
          price: lq.price.toString(),
          currency: lq.currency,
          dayChangePct:
            lq.dayChangePct != null ? lq.dayChangePct.toString() : null,
          provider: lq.provider,
          fetchedAt: sql`now()`,
        },
      });
  } catch {}
}
