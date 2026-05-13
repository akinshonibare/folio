import { and, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { yahooFetcher } from "./yahoo";
import { finnhubFetcher } from "./finnhub";
import { finnhubAvailable } from "@/lib/finnhub/client";
import type { Quote, QuoteAssetKind } from "./types";

/**
 * Live quote cache TTL — 5 minutes. Aggressive enough that a refresh while
 * the user is actively browsing still feels live, lazy enough that Yahoo
 * + Finnhub free tiers don't get hammered.
 */
const LIVE_TTL_MS = 5 * 60 * 1000;

export type LiveQuote = {
  instrumentId: number;
  symbol: string;
  price: number;
  currency: string;
  dayChangePct: number | null;
  provider: "yahoo" | "finnhub";
  fetchedAt: Date;
};

type Target = {
  instrumentId: number;
  symbol: string;
  exchange: string;
  kind: QuoteAssetKind;
  /** Currency the broker reports this position in. If a live provider
   *  returns a different currency, we reject it — that mismatch means the
   *  provider resolved to the wrong listing (most often a CDR vs its US
   *  underlying). */
  brokerCurrency?: string;
};

/**
 * Returns live quotes for a batch of instruments. Reads the `live_quotes`
 * DB cache first; for instruments whose cached row is older than TTL (or
 * missing), fetches Yahoo, falls back to Finnhub on failure, and upserts
 * the result. Options are skipped (Yahoo doesn't price them stably).
 */
export async function batchLiveQuotes(
  targets: Target[],
): Promise<Map<number, LiveQuote>> {
  const out = new Map<number, LiveQuote>();
  if (targets.length === 0) return out;

  // Read cached rows
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
    if (c && now - c.fetchedAt.getTime() < LIVE_TTL_MS) {
      out.set(t.instrumentId, {
        instrumentId: t.instrumentId,
        symbol: t.symbol,
        price: parseFloat(c.price),
        currency: c.currency,
        dayChangePct: c.dayChangePct != null ? parseFloat(c.dayChangePct) : null,
        provider: c.provider as "yahoo" | "finnhub",
        fetchedAt: c.fetchedAt,
      });
    } else {
      stale.push(t);
    }
  }
  if (stale.length === 0) return out;

  const fb = finnhubAvailable();
  await Promise.all(
    stale.map(async (t) => {
      let q: Quote | null = null;
      try {
        q = await yahooFetcher.fetch({
          symbol: t.symbol,
          exchange: t.exchange,
          kind: t.kind,
        });
      } catch {}
      if (!q && fb) {
        try {
          q = await finnhubFetcher.fetch({
            symbol: t.symbol,
            exchange: t.exchange,
            kind: t.kind,
          });
        } catch {}
      }
      if (!q) return;
      // Defense in depth: if the provider returned a price in a different
      // currency than what the broker reports for this position, that's a
      // wrong-listing match — skip and let the caller fall back to broker
      // value. Catches CDR-mis-resolution that the Finnhub fetcher already
      // guards against, plus any future provider quirks.
      if (t.brokerCurrency && q.currency !== t.brokerCurrency) {
        return;
      }
      const lq: LiveQuote = {
        instrumentId: t.instrumentId,
        symbol: t.symbol,
        price: q.price,
        currency: q.currency,
        dayChangePct: q.dayChangePct,
        provider: q.provider as "yahoo" | "finnhub",
        fetchedAt: new Date(),
      };
      out.set(t.instrumentId, lq);
      // Persist
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
    }),
  );

  return out;
}
