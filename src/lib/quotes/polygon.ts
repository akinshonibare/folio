import type { Quote, QuoteFetcher, QuoteRequest } from "./types";

/**
 * Polygon.io fetcher — STUB.
 *
 * To enable: set POLYGON_API_KEY in the environment. Even when the key is
 * present, individual users still have to opt in via their settings; see
 * `provider.ts` for the resolution order.
 *
 * Implementation deferred to TODO.md phase 7. Polygon's value-add is real
 * options pricing + Greeks; until then the option panel will compute current
 * value from Wealthsimple's `Market Price` (premium per share at upload time)
 * which is stale but accurate at the moment of upload.
 */
export function makePolygonFetcher(_apiKey: string): QuoteFetcher {
  return {
    id: "polygon",
    async fetch(_req: QuoteRequest): Promise<Quote | null> {
      throw new Error(
        "Polygon adapter not implemented yet — see TODO.md phase 7. The provider toggle should remain hidden until this is built.",
      );
    },
  };
}
