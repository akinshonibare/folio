/**
 * Symbol resolution helpers — turn a (symbol, exchange, name) triple from
 * Wealthsimple's CSV into the right identifier for downstream APIs (Yahoo,
 * etc) and the right /t/[symbol] URL for the ticker detail page.
 *
 * Critical for currency correctness. A position labelled symbol="GOOG"
 * exchange="TSX" is a *Canadian Depositary Receipt* trading in CAD on
 * NEO/Cboe Canada — not the US-listed Alphabet share. If we naively query
 * Yahoo for "GOOG" we get the USD price, which would be wildly wrong for
 * portfolio CAD totals if applied as a live overlay.
 *
 * The unique Yahoo symbol for CDRs is `<TICKER>.NE` (NEO). Regular TSX
 * Canadian-native equities (ENB, SHOP, ATZ, …) use `<TICKER>.TO`.
 */

import { isCdrInstrument } from "./cdr";

export type SymbolContext = {
  symbol: string;
  exchange?: string | null;
  name?: string | null;
  /** Security type from the schema. CRYPTOCURRENCY → coin-USD pair. */
  securityType?: string | null;
};

/**
 * Yahoo symbol for any (symbol, exchange) tuple. Used by:
 *   - the live quote fetcher
 *   - the historical chart fetcher
 *   - any place that links to /t/[symbol] (we link to the Yahoo symbol so
 *     the detail page resolves to the right listing on its own).
 */
export function yahooSymbolFor(ctx: SymbolContext): string {
  const sym = (ctx.symbol ?? "").toUpperCase();
  const ex = (ctx.exchange ?? "").toUpperCase();

  if (ctx.securityType === "CRYPTOCURRENCY") {
    return sym.includes("-") ? sym : `${sym}-USD`;
  }
  // CDRs first — they look like US tickers but trade on NEO in CAD.
  if (isCdrInstrument(sym, ex, ctx.name ?? "")) {
    return `${sym}.NE`;
  }
  if (ex === "TSX") return `${sym}.TO`;
  if (ex === "TSX-V") return `${sym}.V`;
  if (ex === "NEO" || ex === "CBOE") return `${sym}.NE`;
  // US listings (NASDAQ, NYSE, AMEX, ARCA, BATS) use the bare ticker.
  return sym;
}

/**
 * The path-safe identifier used in /t/[symbol] URLs. We always link to the
 * fully-qualified Yahoo symbol so the detail page can fetch the right quote
 * and chart in the right currency without ambiguity. Encoded so dots in
 * suffixes survive routing.
 */
export function tickerHref(ctx: SymbolContext): string {
  return `/t/${encodeURIComponent(yahooSymbolFor(ctx))}`;
}
