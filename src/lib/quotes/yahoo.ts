import { yahoo as yahooFinance } from "@/lib/yahoo/client";
import type { Quote, QuoteFetcher, QuoteRequest } from "./types";
import { yahooSymbolFor } from "@/lib/markets/symbol";

type YahooQuote = {
  regularMarketPrice?: number;
  currency?: string;
  regularMarketChangePercent?: number;
};

/**
 * Yahoo Finance (via the unofficial yahoo-finance2 client). Free, no key.
 *   - Equities/ETFs: direct quote lookup on the resolved Yahoo symbol.
 *   - Crypto: resolves to `<SYMBOL>-USD`.
 *   - CDRs: resolves to `<SYMBOL>.NE` so we get the CAD price not the US share.
 *   - TSX-native: resolves to `<SYMBOL>.TO`.
 *   - Options: Yahoo's options API isn't covered by yahoo-finance2 in a stable
 *     way. Return null so callers know to skip (Polygon picks these up).
 */
export const yahooFetcher: QuoteFetcher = {
  id: "yahoo",
  async fetch(req: QuoteRequest): Promise<Quote | null> {
    if (req.kind === "option") return null;

    const ticker = yahooSymbolFor({
      symbol: req.symbol,
      exchange: req.exchange ?? null,
      securityType:
        req.kind === "crypto"
          ? "CRYPTOCURRENCY"
          : req.kind === "etf"
          ? "EXCHANGE_TRADED_FUND"
          : "EQUITY",
    });
    const q = (await yahooFinance.quote(ticker)) as YahooQuote | undefined;
    if (!q || typeof q.regularMarketPrice !== "number") return null;

    return {
      symbol: req.symbol,
      kind: req.kind,
      price: q.regularMarketPrice,
      currency: q.currency ?? "USD",
      dayChangePct:
        typeof q.regularMarketChangePercent === "number"
          ? q.regularMarketChangePercent
          : null,
      provider: "yahoo",
      fetchedAt: new Date(),
    };
  },
};
