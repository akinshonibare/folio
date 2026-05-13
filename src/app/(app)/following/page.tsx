import Link from "next/link";
import yahooFinance from "yahoo-finance2";
import { ensureUserRow } from "@/lib/auth/session";
import { getWatchlist } from "@/lib/db/watchlist";
import { TopBar } from "@/components/ui/TopBar";
import { Section } from "@/components/ui/Section";
import { TickerRow } from "@/components/ui/TickerRow";
import { FollowingFilters } from "@/components/following/FollowingFilters";

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

  const enriched = items.map((it) => {
    const q = quoteBySymbol.get(it.symbol.toUpperCase());
    return {
      ...it,
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
            Your watchlist is empty. Use ⌘K to search, then tap the star on a
            ticker page.
          </div>
        ) : (
          <>
            <FollowingFilters />
            <Section subhead="" title="">
              <div className="card divide-y divide-[color:var(--color-border)] overflow-hidden">
                {[...enriched]
                  .sort((a, b) => b.marketCap - a.marketCap)
                  .map((it) => (
                    <TickerRow
                      key={it.id}
                      symbol={it.symbol}
                      name={it.name}
                      price={it.price}
                      currency={it.currency}
                      changeAbs={it.changeAbs}
                      changePct={it.changePct}
                    />
                  ))}
              </div>
              <p className="mt-3 text-center text-[11px] text-[color:var(--color-fg-subtle)]">
                Tap any ticker for full detail.{" "}
                <Link href="/markets" className="underline">
                  Discover more
                </Link>
                .
              </p>
            </Section>
          </>
        )}
      </div>
    </>
  );
}
