/**
 * CIBC Canadian Depositary Receipts (CDRs) trade in CAD on Cboe Canada (NEO)
 * but Wealthsimple's CSV labels their exchange as "TSX" with the bare US
 * ticker (e.g. GOOG, V, UNH, FISV…). Without this routing they'd resolve
 * against the US listing — wrong currency, wrong price.
 *
 * Ported and extended from invest-manage/src/lib/finnhub/cdr-map.ts.
 */

const KNOWN_CDRS: Record<string, string> = {
  // ticker.exchange -> underlying US ticker (when needed for analyst lookup)
  "GOOG.TSX": "GOOG",
  "GOOGL.TSX": "GOOGL",
  "VISA.TSX": "V",
  "UNH.TSX": "UNH",
  "FISV.TSX": "FI",
  "AMZN.TSX": "AMZN",
  "AAPL.TSX": "AAPL",
  "MSFT.TSX": "MSFT",
  "META.TSX": "META",
  "NVDA.TSX": "NVDA",
  "TSLA.TSX": "TSLA",
  "NFLX.TSX": "NFLX",
  "DIS.TSX": "DIS",
  "JPM.TSX": "JPM",
  "BAC.TSX": "BAC",
  "WMT.TSX": "WMT",
  "COST.TSX": "COST",
  "BRK.TSX": "BRK.B",
};

export function isCdrInstrument(
  symbol: string,
  exchange: string,
  name: string,
): boolean {
  const key = `${symbol.toUpperCase()}.${(exchange ?? "").toUpperCase()}`;
  if (KNOWN_CDRS[key]) return true;
  const ex = (exchange ?? "").toUpperCase();
  return (
    /\bCDR\b/i.test(name ?? "") &&
    (ex === "TSX" || ex === "NEO" || ex === "CBOE")
  );
}

/**
 * Return the underlying US ticker for a CDR (useful when looking up analyst
 * targets, insider activity, etc — those data sources track the US share,
 * not the depositary receipt).
 */
export function cdrUnderlying(symbol: string, exchange: string): string | null {
  const key = `${symbol.toUpperCase()}.${(exchange ?? "").toUpperCase()}`;
  return KNOWN_CDRS[key] ?? null;
}
