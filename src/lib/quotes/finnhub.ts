import { finnhub, finnhubSymbolFor } from "@/lib/finnhub/client";
import type { Quote, QuoteFetcher, QuoteRequest } from "./types";
import { isCdrInstrument } from "@/lib/markets/cdr";

/**
 * Finnhub fetcher — used as Yahoo fallback. Stocks/ETFs only.
 * Options and crypto are not supported here.
 *
 * Day-change is computed from `c` (current) and `pc` (previous close),
 * which is the standard "today vs yesterday close" metric.
 */
export const finnhubFetcher: QuoteFetcher = {
  id: "finnhub" as const,
  async fetch(req: QuoteRequest): Promise<Quote | null> {
    if (req.kind === "option" || req.kind === "crypto") return null;
    // Finnhub doesn't reliably serve Canadian Depositary Receipt prices, and
    // resolving CDRs to the US underlying gives a price in the WRONG
    // currency at the WRONG share-ratio — we'd inflate the position 5×.
    // Skip CDRs here and let the caller fall back to broker-reported value.
    if (isCdrInstrument(req.symbol, req.exchange ?? "", "")) return null;
    const ticker = finnhubSymbolFor({
      symbol: req.symbol,
      exchange: req.exchange ?? null,
      isCdr: false,
    });
    try {
      const q = await finnhub.quote(ticker);
      if (!q || typeof q.c !== "number" || q.c <= 0) return null;
      const dayChangePct =
        typeof q.dp === "number" && Number.isFinite(q.dp)
          ? q.dp
          : q.pc > 0
          ? ((q.c - q.pc) / q.pc) * 100
          : null;
      return {
        symbol: req.symbol,
        kind: req.kind,
        price: q.c,
        currency: ticker.endsWith(".TO") || ticker.endsWith(".V") || ticker.endsWith(".NE") ? "CAD" : "USD",
        dayChangePct,
        provider: "finnhub" as const,
        fetchedAt: new Date(),
      };
    } catch {
      return null;
    }
  },
} as unknown as QuoteFetcher;
