import { ensureUserRow } from "@/lib/auth/session";
import { currentUser } from "@clerk/nextjs/server";
import {
  getLatestSnapshot,
  getPreviousSnapshot,
  getHoldings,
} from "@/lib/db/queries";
import { getWatchlist } from "@/lib/db/watchlist";
import { computeMovement } from "@/lib/portfolio/aggregate";
import { fetchTrendingCrypto, fetchTrendingStocks } from "@/lib/markets/trending";
import { fetchUpcomingEvents } from "@/lib/markets/earnings";
import { fetchYahooNews, type NewsItem } from "@/lib/news/yahoo";
import { TopBar } from "@/components/ui/TopBar";
import { Section, SeeAllLink } from "@/components/ui/Section";
import { WelcomeHero } from "@/components/home/WelcomeHero";
import { DailyMoversBars } from "@/components/home/DailyMoversBars";
import { WhyIsItMoving } from "@/components/home/WhyIsItMoving";
import { UpcomingEvents } from "@/components/home/UpcomingEvents";
import { TrendingScroll } from "@/components/home/TrendingScroll";
import { TickerIcon } from "@/components/ui/TickerIcon";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const userId = await ensureUserRow();
  const user = await currentUser();
  const displayName =
    user?.firstName ?? user?.username ?? null;

  const snap = await getLatestSnapshot(userId);
  const prev = snap ? await getPreviousSnapshot(userId, snap.id) : null;
  const [holdings, prevHoldings, watchRows] = await Promise.all([
    snap ? getHoldings(userId, snap.id) : Promise.resolve([]),
    prev ? getHoldings(userId, prev.id) : Promise.resolve([]),
    getWatchlist(userId),
  ]);
  const movement = prevHoldings.length
    ? await computeMovement(holdings, prevHoldings)
    : [];

  // Movers across stocks only (skip options for the bars view).
  const stockMovement = movement.filter(
    (m) => m.securityType !== "OPTION" && m.deltaPct !== 0,
  );
  const moverBars = stockMovement
    .map((m) => ({ symbol: m.symbol, changePct: m.deltaPct }))
    .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
    .slice(0, 6);

  // "Why is it moving" — pick the single biggest mover; live-quote it.
  const topMover = stockMovement[0];

  // Trending markets data + earnings calendar (parallel).
  const heldSymbols = Array.from(
    new Set(
      [
        ...holdings
          .filter((h) => h.securityType !== "OPTION" && h.securityType !== "CRYPTOCURRENCY")
          .map((h) => h.symbol),
        ...watchRows.map((w) => w.symbol),
      ].filter(Boolean),
    ),
  );
  const [trendingCrypto, trendingStocks, events, news] = await Promise.all([
    fetchTrendingCrypto(),
    fetchTrendingStocks("US"),
    heldSymbols.length
      ? fetchUpcomingEvents(heldSymbols.slice(0, 20))
      : Promise.resolve([]),
    topMover
      ? fetchYahooNews(topMover.symbol, 5)
      : Promise.resolve([] as NewsItem[]),
  ]);

  return (
    <>
      <TopBar title="Home" />
      <div className="space-y-7 pt-2">
        <WelcomeHero name={displayName} />

        {!snap && (
          <div className="card p-6 text-center">
            <p className="font-semibold">Upload your first CSV</p>
            <p className="mt-1 text-sm text-[color:var(--color-fg-muted)]">
              Drop your Wealthsimple holdings CSV to wake up the rest of folio.
            </p>
            <Link
              href="/upload"
              className="btn-accent mt-4 inline-flex"
            >
              Get Started
            </Link>
          </div>
        )}

        <Section subhead="Stay on top" title="Your Daily Movers">
          <DailyMoversBars items={moverBars} />
        </Section>

        {topMover && (
          <Section subhead="Seeking answers" title="Why Is It Moving">
            <WhyIsItMoving
              symbol={topMover.symbol}
              name={topMover.name}
              price={topMover.currentValueCad / Math.max(1, 1)}
              changePct={topMover.deltaPct}
            />
          </Section>
        )}

        <Section subhead="Mark your calendar" title="Upcoming Events">
          <UpcomingEvents events={events} />
        </Section>

        <Section
          subhead="Discover what's hot"
          title="Trending Crypto"
          right={<SeeAllLink href="/markets?tab=crypto" />}
        >
          <TrendingScroll
            items={trendingCrypto.map((t) => ({
              symbol: t.symbol,
              name: t.name,
              price: t.price,
              changePct: t.changePct,
            }))}
          />
        </Section>

        <Section
          subhead="Discover what's hot"
          title="Trending Stocks"
          right={<SeeAllLink href="/markets?tab=stocks" />}
        >
          <TrendingScroll items={trendingStocks} />
        </Section>

        {news.length > 0 && topMover && (
          <Section subhead="Must reads" title="News & Analysis">
            <div className="card overflow-hidden">
              <div className="flex items-center gap-3 border-b border-[color:var(--color-border)] px-4 py-3">
                <TickerIcon symbol={topMover.symbol} size={32} />
                <div>
                  <p className="font-semibold">{topMover.symbol}</p>
                  <p className="text-xs text-[color:var(--color-fg-muted)]">
                    Top headlines
                  </p>
                </div>
              </div>
              <ul>
                {news.slice(0, 5).map((n) => (
                  <li
                    key={n.providerId}
                    className="border-b border-[color:var(--color-border)]/60 last:border-b-0"
                  >
                    <a
                      href={n.link}
                      target="_blank"
                      rel="noreferrer"
                      className="block px-4 py-3 transition hover:bg-[color:var(--color-surface-2)]/50"
                    >
                      <p className="text-sm font-medium leading-snug">
                        {n.title}
                      </p>
                      <p className="mt-1 text-xs text-[color:var(--color-fg-subtle)]">
                        {n.publisher ?? "Yahoo Finance"}
                      </p>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </Section>
        )}
      </div>
    </>
  );
}
