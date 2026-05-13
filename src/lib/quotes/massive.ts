import { massive, massiveOptionTicker } from "@/lib/massive/client";
import type { Quote, QuoteFetcher, QuoteRequest } from "./types";

/**
 * Massive (Polygon) fetcher. On free tier:
 *   - Options: previous-day close via /v2/aggs/ticker/{O:OCC}/prev. EOD only
 *     but vastly better than broker-uploaded prices that age out.
 *   - Stocks: previous-day close (we prefer Yahoo/Finnhub for intraday, so
 *     this branch is a tertiary fallback rarely exercised).
 *
 * Day-change is computed from (close − open) of the previous trading day,
 * which is the only intraday-ish signal free tier can produce. Better than
 * nothing for options where Yahoo + Finnhub return null.
 */
export const massiveFetcher: QuoteFetcher = {
  id: "polygon" as const,
  async fetch(req: QuoteRequest): Promise<Quote | null> {
    const ticker =
      req.kind === "option" ? massiveOptionTicker(req.symbol) : req.symbol;
    try {
      const resp = await massive.prev(ticker);
      const r = resp.results?.[0];
      if (!r || typeof r.c !== "number" || r.c <= 0) return null;
      const dayChangePct =
        r.o > 0 ? ((r.c - r.o) / r.o) * 100 : null;
      return {
        symbol: req.symbol,
        kind: req.kind,
        price: r.c,
        // Massive's options/stocks endpoints are USD-only on free tier.
        currency: "USD",
        dayChangePct,
        provider: "polygon",
        fetchedAt: new Date(),
      };
    } catch {
      return null;
    }
  },
};
