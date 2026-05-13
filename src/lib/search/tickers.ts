import { yahoo as yahooFinance } from "@/lib/yahoo/client";

export type TickerHit = {
  symbol: string;
  name: string;
  exchange: string;
  kind: "EQUITY" | "ETF" | "CRYPTO" | "OPTION" | "OTHER";
};

type YahooSearchQuote = {
  symbol?: string;
  shortname?: string;
  longname?: string;
  exchDisp?: string;
  typeDisp?: string;
  quoteType?: string;
};

type YahooSearchResult = {
  quotes?: YahooSearchQuote[];
};

/**
 * Global ticker search via Yahoo. Returns up to `count` results, filtered to
 * tradable types we care about.
 */
export async function searchTickers(
  query: string,
  count = 8,
): Promise<TickerHit[]> {
  const q = query.trim();
  if (!q) return [];
  try {
    const result = (await yahooFinance.search(q, {
      quotesCount: count,
      newsCount: 0,
    })) as YahooSearchResult;
    const quotes = result.quotes ?? [];
    return quotes
      .filter((qq) => qq.symbol)
      .map((qq) => ({
        symbol: qq.symbol!,
        name: qq.longname ?? qq.shortname ?? qq.symbol!,
        exchange: qq.exchDisp ?? "",
        kind: mapKind(qq.quoteType ?? qq.typeDisp ?? ""),
      }));
  } catch {
    return [];
  }
}

function mapKind(t: string): TickerHit["kind"] {
  const up = t.toUpperCase();
  if (up === "EQUITY") return "EQUITY";
  if (up === "ETF" || up === "MUTUALFUND") return "ETF";
  if (up === "CRYPTOCURRENCY") return "CRYPTO";
  if (up === "OPTION") return "OPTION";
  return "OTHER";
}
