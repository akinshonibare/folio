import yahooFinance from "yahoo-finance2";
import { ensureUserRow } from "@/lib/auth/session";
import {
  getLatestSnapshot,
  getPreviousSnapshot,
  getHoldings,
} from "@/lib/db/queries";
import { computeMovement } from "@/lib/portfolio/aggregate";
import { TopBar } from "@/components/ui/TopBar";
import { Section } from "@/components/ui/Section";
import { WhyIsItMoving } from "@/components/home/WhyIsItMoving";
import { DailyBriefing } from "@/components/insights/DailyBriefing";
import { InsiderMoves } from "@/components/insights/InsiderMoves";
import { TickerRow } from "@/components/ui/TickerRow";
import { getInsiderForSymbols } from "@/lib/db/calendar";

export const dynamic = "force-dynamic";

type YahooQuote = {
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  currency?: string;
  shortName?: string;
  longName?: string;
};

export default async function InsightsPage() {
  const userId = await ensureUserRow();
  const snap = await getLatestSnapshot(userId);
  if (!snap) {
    return (
      <>
        <TopBar title="Insights" />
        <div className="card mt-6 p-6 text-center text-sm text-[color:var(--color-fg-muted)]">
          Insights wake up once you have a snapshot. Upload your CSV first.
        </div>
      </>
    );
  }
  const prev = await getPreviousSnapshot(userId, snap.id);
  const [holdings, prevHoldings] = await Promise.all([
    getHoldings(userId, snap.id),
    prev ? getHoldings(userId, prev.id) : Promise.resolve([]),
  ]);
  const movement = prevHoldings.length
    ? await computeMovement(holdings, prevHoldings)
    : [];

  const topMover = movement.find((m) => m.securityType !== "OPTION");
  // Top 6 by absolute position size for the "needs your eye" list.
  const topPositions = [...holdings]
    .filter((h) => h.securityType !== "OPTION")
    .sort((a, b) => parseFloat(b.bookValueCad) - parseFloat(a.bookValueCad))
    .slice(0, 6);
  const symbols = topPositions.map((p) => p.symbol);
  const heldSymbols = Array.from(
    new Set(
      holdings
        .filter(
          (h) =>
            h.securityType !== "OPTION" && h.securityType !== "CRYPTOCURRENCY",
        )
        .map((h) => h.symbol),
    ),
  );
  let quoteMap = new Map<string, YahooQuote>();
  const yQuotePromise: Promise<YahooQuote[] | YahooQuote | null> = symbols.length
    ? (yahooFinance.quote(symbols) as Promise<YahooQuote[] | YahooQuote>).catch(
        () => null,
      )
    : Promise.resolve(null);
  const [quotesP, insider] = await Promise.all([
    yQuotePromise,
    heldSymbols.length
      ? getInsiderForSymbols(heldSymbols, 12)
      : Promise.resolve([]),
  ]);
  if (quotesP) {
    const arr = Array.isArray(quotesP)
      ? (quotesP as YahooQuote[])
      : ([quotesP] as YahooQuote[]);
    quoteMap = new Map(
      arr
        .filter((x) => (x as { symbol?: string }).symbol)
        .map((x) => [
          (x as { symbol?: string }).symbol!.toUpperCase(),
          x,
        ]),
    );
  }

  return (
    <>
      <TopBar title="Insights" />
      <div className="space-y-6 pt-2">
        <DailyBriefing />

        {topMover && (
          <Section subhead="Seeking answers" title="Why Is It Moving">
            <WhyIsItMoving
              symbol={topMover.symbol}
              name={topMover.name}
              price={null}
              changePct={topMover.deltaPct}
            />
          </Section>
        )}

        <Section subhead="Pay attention to" title="Your top positions">
          <div className="card divide-y divide-[color:var(--color-border)] overflow-hidden">
            {topPositions.map((p) => {
              const q = quoteMap.get(p.symbol.toUpperCase());
              return (
                <TickerRow
                  key={p.positionId}
                  symbol={p.symbol}
                  name={p.name ?? q?.longName ?? q?.shortName ?? null}
                  price={q?.regularMarketPrice ?? null}
                  currency={q?.currency ?? null}
                  changeAbs={q?.regularMarketChange ?? null}
                  changePct={q?.regularMarketChangePercent ?? null}
                />
              );
            })}
          </div>
        </Section>

        <Section subhead="Follow the insiders" title="Top Insider Moves">
          <InsiderMoves rows={insider} />
        </Section>
      </div>
    </>
  );
}
