/**
 * Finnhub client (free tier). 60 req/min global; we throttle to ~1 call/sec
 * with a small buffer. Used as a Yahoo fallback when Yahoo rate-limits our
 * IP, and as the primary source for earnings calendar + insider data.
 *
 * Ported from invest-manage with minor cleanup.
 */

const BASE = "https://finnhub.io/api/v1";

let lastCallAt = 0;
const MIN_INTERVAL_MS = 1050;

async function throttle() {
  const now = Date.now();
  const wait = Math.max(0, lastCallAt + MIN_INTERVAL_MS - now);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCallAt = Date.now();
}

async function call<T>(
  path: string,
  params: Record<string, string | number>,
): Promise<T> {
  await throttle();
  const key = process.env.FINNHUB_API_KEY;
  if (!key) throw new Error("FINNHUB_API_KEY not set");
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  url.searchParams.set("token", key);
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (res.status === 429) {
    await new Promise((r) => setTimeout(r, 2500));
    return call(path, params);
  }
  if (!res.ok) {
    throw new Error(`finnhub ${path} -> ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export type FinnhubQuote = {
  c: number; // current
  d: number | null;
  dp: number | null;
  h: number;
  l: number;
  o: number;
  pc: number; // previous close
  t: number;
};

export type FinnhubCalendarEarnings = {
  earningsCalendar: Array<{
    symbol: string;
    date: string;
    epsActual?: number | null;
    epsEstimate?: number | null;
    hour: string;
    quarter: number;
    year: number;
  }>;
};

export type FinnhubInsider = {
  data: Array<{
    name: string;
    share: number;
    change: number;
    filingDate: string;
    transactionDate: string;
    transactionPrice: number;
    transactionCode: string;
  }>;
};

export function finnhubAvailable(): boolean {
  return !!process.env.FINNHUB_API_KEY;
}

export const finnhub = {
  quote: (symbol: string) => call<FinnhubQuote>("/quote", { symbol }),
  upcomingEarnings: (symbol: string, from: string, to: string) =>
    call<FinnhubCalendarEarnings>("/calendar/earnings", { symbol, from, to }),
  insiders: (symbol: string, from: string, to: string) =>
    call<FinnhubInsider>("/stock/insider-transactions", { symbol, from, to }),
};

/**
 * Finnhub symbol resolution. Most US tickers are bare; TSX appends `.TO`.
 * CDR-on-NEO is `.NE` but Finnhub free coverage there is spotty; we resolve
 * CDRs to the underlying US ticker as a more reliable price source for
 * "what is the company worth today" (the CDR is just a CAD wrapper).
 */
export function finnhubSymbolFor(opts: {
  symbol: string;
  exchange?: string | null;
  isCdr?: boolean;
}): string {
  const s = opts.symbol.toUpperCase();
  const ex = (opts.exchange ?? "").toUpperCase();
  if (opts.isCdr) return s;
  if (ex === "TSX") return `${s}.TO`;
  if (ex === "TSX-V") return `${s}.V`;
  if (ex === "NEO" || ex === "CBOE") return `${s}.NE`;
  return s;
}
