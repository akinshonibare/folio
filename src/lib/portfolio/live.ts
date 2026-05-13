import type { HoldingRow } from "@/lib/db/queries";
import { batchLiveQuotes, type LiveQuote } from "@/lib/quotes/batch";
import { getFxRate } from "@/lib/fx/rates";

export type LivePosition = {
  positionId: number;
  instrumentId: number;
  symbol: string;
  name: string | null;
  accountClassification: string;
  securityType: string;
  quantity: number;

  /** Live price in the instrument's native currency. Falls back to broker
   *  marketPrice when no live quote is available. */
  livePrice: number;
  livePriceCurrency: string;
  livePriceProvider: "yahoo" | "finnhub" | "polygon" | "broker";

  /** % change over the past 24h (today vs previous close). Null when the
   *  provider didn't supply it. */
  dayChangePct: number | null;

  /** CAD-valued snapshot of the position right now. */
  liveValueCad: number;
  /** CAD-valued snapshot at yesterday's close (computed from dayChangePct). */
  prevCloseValueCad: number;
  /** liveValueCad - prevCloseValueCad. */
  dayDeltaCad: number;

  /** Cost basis from broker (already CAD). */
  bookValueCad: number;
};

export type LivePortfolio = {
  positions: LivePosition[];
  totalCad: number;
  prevCloseTotalCad: number;
  dayDeltaCad: number;
  dayDeltaPct: number;
  totalCostCad: number;
  totalReturnCad: number;
  totalReturnPct: number;
  byAccount: Record<string, { value: number; cost: number; returnPct: number }>;
  optionsCad: number;
  cryptoCad: number;
  /** Most recent fetchedAt across all live quotes; the dashboard shows this
   *  as "as of …". */
  asOf: Date | null;
};

/**
 * Build a live valuation of the user's latest snapshot. Quantities + cost
 * basis come from the CSV; prices come from Yahoo (or Finnhub fallback).
 *
 * Day-change is computed from the live providers' "vs yesterday close"
 * signal, NOT from the previous CSV snapshot. Means the dashboard works
 * day-to-day even if no new CSV has been uploaded in weeks.
 */
export async function buildLivePortfolio(
  holdings: HoldingRow[],
): Promise<LivePortfolio> {
  // Live quotes for everything we can price: equities, ETFs, crypto, AND
  // options (via Polygon/Massive). Options without a Polygon quote fall back
  // to broker-uploaded marketValueNative in the per-position loop below.
  const targets = holdings.map((h) => ({
    instrumentId: h.instrumentId,
    symbol: h.symbol,
    exchange: h.exchange,
    kind:
      h.securityType === "CRYPTOCURRENCY"
        ? ("crypto" as const)
        : h.securityType === "EXCHANGE_TRADED_FUND"
        ? ("etf" as const)
        : h.securityType === "OPTION"
        ? ("option" as const)
        : ("equity" as const),
    brokerCurrency: h.marketPriceCurrency,
  }));
  const liveMap = await batchLiveQuotes(targets);

  // FX rates per currency seen
  const currencies = new Set<string>();
  for (const h of holdings) currencies.add(h.marketValueNativeCurrency);
  for (const [, q] of liveMap) currencies.add(q.currency);
  const fxCache = new Map<string, number>();
  await Promise.all(
    Array.from(currencies).map(async (ccy) => {
      try {
        fxCache.set(ccy, await getFxRate(ccy, "CAD"));
      } catch {
        fxCache.set(ccy, ccy === "CAD" ? 1 : NaN);
      }
    }),
  );

  let asOf: Date | null = null;
  const positions: LivePosition[] = holdings.map((h) => {
    const qty = parseFloat(h.quantity);
    const live = liveMap.get(h.instrumentId);
    let livePrice: number;
    let livePriceCurrency: string;
    let provider: LivePosition["livePriceProvider"];
    if (live) {
      livePrice = live.price;
      livePriceCurrency = live.currency;
      provider = live.provider;
      if (!asOf || live.fetchedAt > asOf) asOf = live.fetchedAt;
    } else {
      livePrice = parseFloat(h.marketPrice);
      livePriceCurrency = h.marketPriceCurrency;
      provider = "broker";
    }
    const fx = fxCache.get(livePriceCurrency) ?? NaN;
    // Value calc depends on whether we have a live quote AND what kind of
    // instrument it is:
    //   - Live equity/ETF/crypto: qty × livePrice × FX.
    //   - Live option: qty (contracts) × livePrice (premium/share) × 100 ×
    //     FX (broker reports MV that way; Polygon also returns premium/share).
    //   - No live quote: trust broker's reported market_value_native × FX.
    let liveValueCad: number;
    if (live) {
      const contractMul = h.securityType === "OPTION" ? 100 : 1;
      liveValueCad = Number.isFinite(fx)
        ? qty * livePrice * contractMul * fx
        : 0;
    } else {
      const brokerFx =
        fxCache.get(h.marketValueNativeCurrency) ??
        (h.marketValueNativeCurrency === "CAD" ? 1 : NaN);
      liveValueCad = Number.isFinite(brokerFx)
        ? parseFloat(h.marketValueNative) * brokerFx
        : 0;
    }
    const dayChangePct = live?.dayChangePct ?? null;
    const prevCloseValueCad =
      dayChangePct != null
        ? liveValueCad / (1 + dayChangePct / 100)
        : liveValueCad;
    return {
      positionId: h.positionId,
      instrumentId: h.instrumentId,
      symbol: h.symbol,
      name: h.name,
      accountClassification: h.accountClassification,
      securityType: h.securityType,
      quantity: qty,
      livePrice,
      livePriceCurrency,
      livePriceProvider: provider,
      dayChangePct,
      liveValueCad,
      prevCloseValueCad,
      dayDeltaCad: liveValueCad - prevCloseValueCad,
      bookValueCad: parseFloat(h.bookValueCad),
    };
  });

  const totalCad = positions.reduce((s, p) => s + p.liveValueCad, 0);
  const prevCloseTotalCad = positions.reduce((s, p) => s + p.prevCloseValueCad, 0);
  const totalCostCad = positions.reduce((s, p) => s + p.bookValueCad, 0);
  const dayDeltaCad = totalCad - prevCloseTotalCad;
  const dayDeltaPct =
    prevCloseTotalCad > 0 ? (dayDeltaCad / prevCloseTotalCad) * 100 : 0;
  const totalReturnCad = totalCad - totalCostCad;
  const totalReturnPct =
    totalCostCad > 0 ? (totalReturnCad / totalCostCad) * 100 : 0;

  const byAccount = new Map<
    string,
    { value: number; cost: number; returnPct: number }
  >();
  for (const p of positions) {
    const a = byAccount.get(p.accountClassification) ?? {
      value: 0,
      cost: 0,
      returnPct: 0,
    };
    a.value += p.liveValueCad;
    a.cost += p.bookValueCad;
    byAccount.set(p.accountClassification, a);
  }
  for (const a of byAccount.values()) {
    a.returnPct = a.cost > 0 ? ((a.value - a.cost) / a.cost) * 100 : 0;
  }

  const optionsCad = positions
    .filter((p) => p.securityType === "OPTION")
    .reduce((s, p) => s + p.liveValueCad, 0);
  const cryptoCad = positions
    .filter((p) => p.securityType === "CRYPTOCURRENCY")
    .reduce((s, p) => s + p.liveValueCad, 0);

  return {
    positions,
    totalCad,
    prevCloseTotalCad,
    dayDeltaCad,
    dayDeltaPct,
    totalCostCad,
    totalReturnCad,
    totalReturnPct,
    byAccount: Object.fromEntries(byAccount),
    optionsCad,
    cryptoCad,
    asOf,
  };
}
