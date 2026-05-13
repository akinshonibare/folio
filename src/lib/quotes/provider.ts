import type { QuoteFetcher, QuoteProvider } from "./types";
import { yahooFetcher } from "./yahoo";
import { makePolygonFetcher } from "./polygon";

/**
 * Resolve which quote fetcher to use for a given user request.
 *
 * Order:
 *   1. If the user has explicitly chosen Polygon (rebranded "Massive") AND
 *      either `MASSIVE_API_KEY` or `POLYGON_API_KEY` is set, use Polygon.
 *   2. Otherwise, use Yahoo.
 *
 * The "Polygon" option in the settings UI must be hidden when
 * `polygonAvailable()` is false, so the user can't pick something the server
 * can't honour.
 */
export function getFetcher(userPreference: QuoteProvider): QuoteFetcher {
  if (userPreference === "polygon" && polygonAvailable()) {
    const key = process.env.MASSIVE_API_KEY ?? process.env.POLYGON_API_KEY!;
    return makePolygonFetcher(key);
  }
  return yahooFetcher;
}

export function polygonAvailable(): boolean {
  return Boolean(process.env.MASSIVE_API_KEY ?? process.env.POLYGON_API_KEY);
}
