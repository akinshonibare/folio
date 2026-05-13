import yahooFinance from "yahoo-finance2";

export type Range = "1W" | "1M" | "3M" | "1Y" | "ALL";

export type HistoryPoint = {
  date: string; // ISO yyyy-mm-dd
  close: number;
};

type YahooChartQuote = {
  date?: Date;
  close?: number | null;
};

type YahooChart = {
  quotes?: YahooChartQuote[];
};

function rangeToStartDate(range: Range): Date {
  const now = new Date();
  const d = new Date(now);
  switch (range) {
    case "1W":
      d.setDate(now.getDate() - 7);
      break;
    case "1M":
      d.setMonth(now.getMonth() - 1);
      break;
    case "3M":
      d.setMonth(now.getMonth() - 3);
      break;
    case "1Y":
      d.setFullYear(now.getFullYear() - 1);
      break;
    case "ALL":
      d.setFullYear(now.getFullYear() - 5);
      break;
  }
  return d;
}

function rangeToInterval(
  range: Range,
): "1d" | "1wk" | "1mo" {
  if (range === "1W" || range === "1M" || range === "3M") return "1d";
  if (range === "1Y") return "1d";
  return "1wk";
}

/**
 * Daily/weekly close history for a ticker. Skips bars without a close (Yahoo
 * occasionally returns nulls around halts or stale early-morning bars).
 */
export async function fetchHistory(
  symbol: string,
  range: Range,
): Promise<HistoryPoint[]> {
  try {
    const result = (await yahooFinance.chart(symbol, {
      period1: rangeToStartDate(range),
      interval: rangeToInterval(range),
    })) as YahooChart;
    const quotes = result.quotes ?? [];
    return quotes
      .filter(
        (q): q is { date: Date; close: number } =>
          q.date instanceof Date && typeof q.close === "number",
      )
      .map((q) => ({
        date: q.date.toISOString().slice(0, 10),
        close: q.close,
      }));
  } catch {
    return [];
  }
}
