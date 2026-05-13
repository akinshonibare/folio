/**
 * Massive (formerly Polygon.io) client. Free tier — 5 req/min, end-of-day
 * data only. Snapshot/intraday endpoints are paid.
 *
 * Folio uses Massive primarily for OPTIONS EOD pricing — neither Yahoo nor
 * Finnhub serves options data reliably. EOD is fine for our use case: option
 * marks don't change minute-to-minute the way underlying stocks do, and the
 * cost basis the user uploaded becomes increasingly stale otherwise.
 *
 * Strict 12-second throttle keeps us well under the 5/min rate limit.
 */

const BASE = "https://api.polygon.io";

let lastCallAt = 0;
const MIN_INTERVAL_MS = 12_500;

async function throttle() {
  const now = Date.now();
  const wait = Math.max(0, lastCallAt + MIN_INTERVAL_MS - now);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCallAt = Date.now();
}

async function call<T>(
  path: string,
  params: Record<string, string | number> = {},
): Promise<T> {
  await throttle();
  const key = process.env.MASSIVE_API_KEY;
  if (!key) throw new Error("MASSIVE_API_KEY not set");
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  url.searchParams.set("apiKey", key);
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (res.status === 429) {
    await new Promise((r) => setTimeout(r, 15_000));
    return call(path, params);
  }
  if (!res.ok) {
    throw new Error(`massive ${path} -> ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export type MassiveAggsPrev = {
  ticker: string;
  status: string;
  resultsCount: number;
  results?: Array<{
    T?: string;
    v: number;
    vw: number;
    o: number;
    c: number;
    h: number;
    l: number;
    t: number;
    n: number;
  }>;
};

export function massiveAvailable(): boolean {
  return !!process.env.MASSIVE_API_KEY;
}

export const massive = {
  /**
   * Previous-day aggregates. Works for stocks (bare ticker) and options
   * (`O:` prefix + stripped OCC symbol).
   */
  prev: (ticker: string) =>
    call<MassiveAggsPrev>(`/v2/aggs/ticker/${encodeURIComponent(ticker)}/prev`),
};

/**
 * Convert our stored OCC option symbol (e.g. "SNDK  260529C02000000" with
 * internal spaces) into the Polygon ticker form: "O:SNDK260529C02000000".
 */
export function massiveOptionTicker(occSymbol: string): string {
  const compact = occSymbol.replace(/\s+/g, "");
  return `O:${compact}`;
}
