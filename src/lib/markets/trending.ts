import { yahoo as yahooFinance } from "@/lib/yahoo/client";

export type TrendingCoin = {
  id: string;
  symbol: string;
  name: string;
  price: number | null;
  changePct: number | null;
};

type CoinGeckoTrendingResp = {
  coins?: Array<{
    item?: {
      id?: string;
      coin_id?: number;
      name?: string;
      symbol?: string;
      data?: { price?: number; price_change_percentage_24h?: { usd?: number } };
    };
  }>;
};

/**
 * Trending crypto from CoinGecko's public trending endpoint. Free, no key.
 */
export async function fetchTrendingCrypto(): Promise<TrendingCoin[]> {
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/search/trending", {
      next: { revalidate: 600 },
    });
    if (!res.ok) return [];
    const j = (await res.json()) as CoinGeckoTrendingResp;
    return (j.coins ?? [])
      .filter((c) => c.item?.symbol)
      .map((c) => ({
        id: c.item!.id ?? "",
        symbol: c.item!.symbol!.toUpperCase(),
        name: c.item!.name ?? c.item!.symbol!,
        price: c.item!.data?.price ?? null,
        changePct: c.item!.data?.price_change_percentage_24h?.usd ?? null,
      }))
      .slice(0, 8);
  } catch {
    return [];
  }
}

type YahooTrendingResp = {
  finance?: { result?: Array<{ quotes?: Array<{ symbol?: string }> }> };
};

/**
 * Trending tickers from Yahoo. Limited info per row — we hydrate via a
 * follow-up batch quote.
 */
export async function fetchTrendingStocks(region = "US") {
  try {
    const j = (await yahooFinance.trendingSymbols(region)) as YahooTrendingResp;
    const symbols = (j.finance?.result?.[0]?.quotes ?? [])
      .map((q) => q.symbol)
      .filter((s): s is string => !!s)
      .slice(0, 8);
    if (symbols.length === 0) return [];
    const quotes = (await yahooFinance.quote(symbols)) as Array<{
      symbol?: string;
      shortName?: string;
      longName?: string;
      regularMarketPrice?: number;
      currency?: string;
      regularMarketChangePercent?: number;
    }>;
    return quotes
      .filter((q) => q.symbol)
      .map((q) => ({
        symbol: q.symbol!,
        name: q.longName ?? q.shortName ?? null,
        price: q.regularMarketPrice ?? null,
        currency: q.currency ?? "USD",
        changePct: q.regularMarketChangePercent ?? null,
      }));
  } catch {
    return [];
  }
}
