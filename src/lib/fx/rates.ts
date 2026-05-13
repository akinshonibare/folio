import yahooFinance from "yahoo-finance2";

/**
 * Fetch a single FX rate via Yahoo (free, no key).
 *   getFxRate("USD", "CAD") → 1 USD = ? CAD
 *
 * Cached in-process for 30 minutes. The DB-level fx_rates table is populated
 * on snapshot creation by callers that want historical rates; this helper is
 * for live conversions in the dashboard.
 */
type CacheEntry = { rate: number; fetchedAt: number };
const cache = new Map<string, CacheEntry>();
const TTL_MS = 30 * 60 * 1000;

export async function getFxRate(base: string, quote: string): Promise<number> {
  if (base === quote) return 1;
  const key = `${base}/${quote}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.fetchedAt < TTL_MS) {
    return hit.rate;
  }
  // Yahoo FX symbol format: USDCAD=X means "1 USD in CAD"
  const sym = `${base}${quote}=X`;
  const q = (await yahooFinance.quote(sym)) as
    | { regularMarketPrice?: number }
    | undefined;
  const rate = q?.regularMarketPrice;
  if (typeof rate !== "number" || !Number.isFinite(rate)) {
    throw new Error(`FX rate unavailable for ${sym}`);
  }
  cache.set(key, { rate, fetchedAt: Date.now() });
  return rate;
}
