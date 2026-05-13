import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const yf = (await import("yahoo-finance2")).default;
  // Direct calls
  for (const sym of ["^GSPC", "^DJI", "^IXIC", "^FTSE"]) {
    try {
      const q = (await yf.quote(sym)) as { regularMarketPrice?: number };
      console.log(`yahoo.quote(${sym}) -> ${q?.regularMarketPrice}`);
    } catch (e) {
      console.log(`yahoo.quote(${sym}) ERR ${(e as Error).message}`);
    }
  }
  for (const scrId of ["day_gainers", "day_losers", "most_actives"]) {
    try {
      const r = (await yf.screener({ scrIds: scrId, count: 5, lang: "en-US", region: "US" })) as {
        quotes?: Array<{ symbol?: string }>;
      };
      console.log(`screener(${scrId}) -> ${r.quotes?.length ?? 0} quotes`);
    } catch (e) {
      console.log(`screener(${scrId}) ERR ${(e as Error).message}`);
    }
  }
  try {
    const t = (await yf.trendingSymbols("US")) as {
      finance?: { result?: Array<{ quotes?: Array<{ symbol?: string }> }> };
    };
    console.log(
      `trending US -> ${t.finance?.result?.[0]?.quotes?.length ?? 0}`,
    );
  } catch (e) {
    console.log(`trending ERR ${(e as Error).message}`);
  }
  // Polygon gainers/losers
  const key = process.env.MASSIVE_API_KEY!;
  for (const which of ["gainers", "losers"]) {
    const r = await fetch(
      `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/${which}?apiKey=${key}`,
    );
    const j = await r.json();
    console.log(
      `polygon ${which} HTTP ${r.status}, tickers=${j.tickers?.length ?? 0}, status=${j.status}`,
    );
  }
}
main();
