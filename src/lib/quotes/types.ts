export type QuoteProvider = "yahoo" | "polygon";

export type QuoteAssetKind = "equity" | "etf" | "crypto" | "option";

export type QuoteRequest = {
  /** Provider-agnostic identifier: ticker for equities/ETFs, coin symbol for
   *  crypto, OCC symbol for options. */
  symbol: string;
  exchange?: string; // optional disambiguator
  kind: QuoteAssetKind;
};

export type Quote = {
  symbol: string;
  kind: QuoteAssetKind;
  price: number;
  currency: string;
  /** Day-change as a percentage, e.g. 1.23 = +1.23%. May be null if the
   *  provider doesn't supply it for this asset kind (e.g. options on Yahoo). */
  dayChangePct: number | null;
  /** Provider that served this quote. */
  provider: QuoteProvider;
  fetchedAt: Date;
};

export interface QuoteFetcher {
  readonly id: QuoteProvider;
  /** Returns null if the asset is genuinely not supported by this provider
   *  (rather than throwing — callers fall back). Throws on transport errors. */
  fetch(req: QuoteRequest): Promise<Quote | null>;
}
