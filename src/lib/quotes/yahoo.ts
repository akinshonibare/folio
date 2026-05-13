import yahooFinance from "yahoo-finance2";
import type { Quote, QuoteFetcher, QuoteRequest } from "./types";

type YahooQuote = {
  regularMarketPrice?: number;
  currency?: string;
  regularMarketChangePercent?: number;
};

/**
 * Yahoo Finance (via the unofficial yahoo-finance2 client). Free, no key.
 * - Equities/ETFs: direct quote lookup.
 * - Crypto: resolve "BTC" → "BTC-USD" automatically.
 * - Options: Yahoo's options API isn't covered by yahoo-finance2 in a stable
 *   way. We return null and let the provider stack fall back to Polygon (if
 *   the user has it enabled) or skip pricing the leg.
 */
export const yahooFetcher: QuoteFetcher = {
  id: "yahoo",
  async fetch(req: QuoteRequest): Promise<Quote | null> {
    if (req.kind === "option") return null;

    const ticker = mapToYahooSymbol(req);
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

function mapToYahooSymbol(req: QuoteRequest): string {
  if (req.kind === "crypto") {
    return req.symbol.includes("-") ? req.symbol : `${req.symbol}-USD`;
  }
  // TSX listings on Yahoo end in ".TO" (NEO-listed CDRs end in ".NE"). Map
  // the broker's `Exchange` field to the Yahoo suffix when present.
  const ex = req.exchange?.toUpperCase();
  if (ex === "TSX") return `${req.symbol}.TO`;
  if (ex === "TSX-V") return `${req.symbol}.V`;
  if (ex === "BATS") return req.symbol; // Yahoo carries BATS-listed ETFs under bare ticker
  return req.symbol;
}
