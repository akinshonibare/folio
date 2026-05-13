/**
 * StockTwits sentiment — public, no auth needed for the symbol stream
 * endpoint. Bullish/bearish are self-tagged by the poster (no NLP), so
 * volume is more meaningful than direction. Free signal.
 *
 * Ported from invest-manage; keep behaviour aligned.
 */

const BASE = "https://api.stocktwits.com/api/2";

let lastCallAt = 0;
const MIN_INTERVAL_MS = 350;

async function throttle() {
  const now = Date.now();
  const wait = Math.max(0, lastCallAt + MIN_INTERVAL_MS - now);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCallAt = Date.now();
}

type StockTwitsMessage = {
  id: number;
  body: string;
  created_at: string;
  entities?: { sentiment?: { basic?: "Bullish" | "Bearish" } };
};

type StockTwitsSymbolStream = {
  response?: { status?: number };
  errors?: Array<{ message: string }>;
  messages?: StockTwitsMessage[];
};

export type SymbolSentiment = {
  symbol: string;
  bullPct: number | null;
  bearPct: number | null;
  mentions24h: number;
  sampleSize: number;
};

export async function fetchStockTwitsSentiment(
  symbol: string,
): Promise<SymbolSentiment | null> {
  await throttle();
  try {
    const url = `${BASE}/streams/symbol/${encodeURIComponent(symbol)}.json?limit=30`;
    const res = await fetch(url, {
      cache: "no-store",
      headers: { "user-agent": "folio/0.1 (+research)" },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as StockTwitsSymbolStream;
    const messages = json.messages ?? [];
    if (messages.length === 0) return null;

    let bull = 0;
    let bear = 0;
    let tagged = 0;
    const dayCutoff = Date.now() - 24 * 60 * 60 * 1000;
    let mentions24h = 0;
    for (const m of messages) {
      const ts = new Date(m.created_at).getTime();
      if (ts >= dayCutoff) mentions24h++;
      const sent = m.entities?.sentiment?.basic;
      if (sent === "Bullish") {
        bull++;
        tagged++;
      } else if (sent === "Bearish") {
        bear++;
        tagged++;
      }
    }
    if (tagged === 0) {
      return {
        symbol,
        bullPct: null,
        bearPct: null,
        mentions24h,
        sampleSize: messages.length,
      };
    }
    return {
      symbol,
      bullPct: (bull / tagged) * 100,
      bearPct: (bear / tagged) * 100,
      mentions24h,
      sampleSize: messages.length,
    };
  } catch {
    return null;
  }
}
