import Link from "next/link";
import yahooFinance from "yahoo-finance2";
import { ensureUserRow } from "@/lib/auth/session";
import { getWatchlist } from "@/lib/db/watchlist";
import { TopBar } from "@/components/ui/TopBar";
import { FollowingList, type FollowingItem } from "@/components/following/FollowingList";

export const dynamic = "force-dynamic";

type YahooQuote = {
  symbol?: string;
  shortName?: string;
  longName?: string;
  regularMarketPrice?: number;
  currency?: string;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  marketCap?: number;
};

export default async function FollowingPage() {
  const userId = await ensureUserRow();
  const items = await getWatchlist(userId);

  let liveQuotes: YahooQuote[] = [];
  if (items.length) {
    try {
      const symbols = items.map((i) => i.symbol);
      const q = (await yahooFinance.quote(symbols)) as
        | YahooQuote[]
        | YahooQuote;
      liveQuotes = Array.isArray(q) ? q : [q];
    } catch {}
  }
  const quoteBySymbol = new Map(
    liveQuotes
      .filter((q) => q.symbol)
      .map((q) => [q.symbol!.toUpperCase(), q]),
  );

  const enriched: FollowingItem[] = items.map((it) => {
    const q = quoteBySymbol.get(it.symbol.toUpperCase());
    return {
      id: it.id,
      symbol: it.symbol,
      exchange: it.exchange,
      name: it.name ?? q?.longName ?? q?.shortName ?? null,
      securityType: it.securityType,
      graduated: it.graduated,
      price: q?.regularMarketPrice ?? null,
      currency: q?.currency ?? null,
      changeAbs: q?.regularMarketChange ?? null,
      changePct: q?.regularMarketChangePercent ?? null,
      marketCap: q?.marketCap ?? 0,
    };
  });

  return (
    <>
      <TopBar title="Following" />
      <div className="space-y-4 pt-2">
        {items.length === 0 ? (
          <div className="card p-6 text-center text-sm text-[color:var(--color-fg-muted)]">
            Your watchlist is empty. Use ⌘K to search any ticker, then tap the
            star on its detail page.
            <div className="mt-3">
              <Link href="/markets" className="underline">
                Discover from Markets
              </Link>
            </div>
          </div>
        ) : (
          <FollowingList items={enriched} />
        )}
      </div>
    </>
  );
}
