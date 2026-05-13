import yahooFinance from "yahoo-finance2";

export type Mover = {
  symbol: string;
  name: string | null;
  price: number | null;
  currency: string | null;
  changeAbs: number | null;
  changePct: number | null;
  marketCap: number | null;
};

type YahooScreenerQuote = {
  symbol?: string;
  shortName?: string;
  longName?: string;
  regularMarketPrice?: number;
  currency?: string;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  marketCap?: number;
};

type YahooScreenerResult = {
  quotes?: YahooScreenerQuote[];
};

/**
 * Predefined Yahoo screeners.
 *   day_gainers — biggest % up on the day
 *   day_losers  — biggest % down on the day
 *   most_actives — highest volume
 */
export type ScreenerId = "day_gainers" | "day_losers" | "most_actives";

export async function fetchScreener(
  scrIds: ScreenerId,
  count = 12,
): Promise<Mover[]> {
  try {
    const r = (await yahooFinance.screener({
      scrIds,
      count,
      lang: "en-US",
      region: "US",
    })) as YahooScreenerResult;
    return (r.quotes ?? [])
      .filter((q) => q.symbol)
      .map(toMover);
  } catch {
    return [];
  }
}

function toMover(q: YahooScreenerQuote): Mover {
  return {
    symbol: q.symbol!,
    name: q.longName ?? q.shortName ?? null,
    price: q.regularMarketPrice ?? null,
    currency: q.currency ?? null,
    changeAbs: q.regularMarketChange ?? null,
    changePct: q.regularMarketChangePercent ?? null,
    marketCap: q.marketCap ?? null,
  };
}
