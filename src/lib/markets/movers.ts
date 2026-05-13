import { yahoo as yahooFinance } from "@/lib/yahoo/client";

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
    // yahoo-finance2's screener overload typing makes passing the moduleOptions
    // (for validateResult: false) gnarly. We bypass via `as never` because
    // Yahoo's screener payload schema changes upstream and validation
    // routinely false-positives — better to accept whatever they return and
    // pick out the fields we use ourselves.
    const r = (await (
      yahooFinance.screener as unknown as (
        opts: { scrIds: string; count: number; lang: string; region: string },
        queryOptions: Record<string, never>,
        moduleOptions: { validateResult: false },
      ) => Promise<unknown>
    )(
      { scrIds, count, lang: "en-US", region: "US" },
      {},
      { validateResult: false },
    )) as YahooScreenerResult;
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
