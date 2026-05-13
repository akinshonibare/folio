import { yahoo as yahooFinance } from "@/lib/yahoo/client";
import { fetchHistory } from "@/lib/charts/history";

export type IndexQuote = {
  symbol: string;
  label: string;
  price: number | null;
  changePct: number | null;
  spark: number[];
};

const INDEX_SETS = {
  overview: [
    { symbol: "^GSPC", label: "S&P 500" },
    { symbol: "^DJI", label: "DOW" },
    { symbol: "^IXIC", label: "NASDAQ" },
    { symbol: "^FTSE", label: "FTSE 100" },
  ],
  us: [
    { symbol: "^GSPC", label: "S&P 500" },
    { symbol: "^DJI", label: "DOW" },
    { symbol: "^IXIC", label: "NASDAQ" },
    { symbol: "^RUT", label: "RUSSELL" },
  ],
  europe: [
    { symbol: "^FTSE", label: "FTSE 100" },
    { symbol: "^GDAXI", label: "DAX" },
    { symbol: "^FCHI", label: "CAC 40" },
    { symbol: "^STOXX50E", label: "STOXX 50" },
  ],
  apac: [
    { symbol: "^N225", label: "Nikkei 225" },
    { symbol: "^HSI", label: "Hang Seng" },
    { symbol: "^AXJO", label: "ASX 200" },
    { symbol: "000001.SS", label: "Shanghai" },
  ],
};

export type IndexSet = keyof typeof INDEX_SETS;

type YahooQuoteish = {
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
};

export async function fetchIndices(set: IndexSet): Promise<IndexQuote[]> {
  const defs = INDEX_SETS[set];
  const results = await Promise.all(
    defs.map(async (d) => {
      try {
        const [quote, hist] = await Promise.all([
          yahooFinance.quote(d.symbol) as Promise<YahooQuoteish | null>,
          fetchHistory(d.symbol, "1M"),
        ]);
        return {
          symbol: d.symbol,
          label: d.label,
          price: quote?.regularMarketPrice ?? null,
          changePct: quote?.regularMarketChangePercent ?? null,
          spark: hist.map((h) => h.close),
        };
      } catch {
        return {
          symbol: d.symbol,
          label: d.label,
          price: null,
          changePct: null,
          spark: [],
        };
      }
    }),
  );
  return results;
}
