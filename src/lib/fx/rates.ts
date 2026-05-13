import { yahoo as yahooFinance } from "@/lib/yahoo/client";

/**
 * Fetch a single FX rate via Yahoo (free, no key).
 *   getFxRate("USD", "CAD") → 1 USD = ? CAD
 *
 * Strategy:
 *   1. In-process cache, 30 min TTL.
 *   2. On cache miss, try Yahoo. On success, refresh cache.
 *   3. On Yahoo failure: if we ever fetched this pair before in this process,
 *      return the last-known-good value (stale-while-rate-limited).
 *   4. Last-resort fallbacks for the common pairs so the dashboard never
 *      silently treats USD as 1:1 CAD. Live rate will overwrite on next
 *      successful fetch.
 */
type CacheEntry = { rate: number; fetchedAt: number };
const cache = new Map<string, CacheEntry>();
const TTL_MS = 30 * 60 * 1000;

// Last-resort fallbacks (recent realistic values). Used only when Yahoo
// returns nothing AND we've never had a live rate this process. Avoids the
// silent "USD treated as CAD" failure mode the previous version had.
const FALLBACK: Record<string, number> = {
  "USD/CAD": 1.37,
  "CAD/USD": 1 / 1.37,
  "EUR/CAD": 1.48,
  "GBP/CAD": 1.73,
  "JPY/CAD": 0.0095,
};

export async function getFxRate(base: string, quote: string): Promise<number> {
  if (base === quote) return 1;
  const key = `${base}/${quote}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.fetchedAt < TTL_MS) {
    return hit.rate;
  }
  try {
    const sym = `${base}${quote}=X`;
    const q = (await yahooFinance.quote(sym)) as
      | { regularMarketPrice?: number }
      | undefined;
    const rate = q?.regularMarketPrice;
    if (typeof rate === "number" && Number.isFinite(rate) && rate > 0) {
      cache.set(key, { rate, fetchedAt: Date.now() });
      return rate;
    }
  } catch {
    // fall through to stale / fallback
  }
  if (hit) {
    // Stale-while-rate-limited: extend the existing entry so subsequent
    // callers within this request don't re-try the network.
    cache.set(key, { rate: hit.rate, fetchedAt: Date.now() - TTL_MS / 2 });
    return hit.rate;
  }
  const fb = FALLBACK[key];
  if (fb != null) {
    cache.set(key, { rate: fb, fetchedAt: Date.now() - TTL_MS / 2 });
    return fb;
  }
  throw new Error(`FX rate unavailable for ${base}/${quote}`);
}
