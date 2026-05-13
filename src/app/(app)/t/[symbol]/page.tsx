import { notFound } from "next/navigation";
import { yahoo as yahooFinance } from "@/lib/yahoo/client";
import { ensureUserRow } from "@/lib/auth/session";
import { getPositionsForSymbol } from "@/lib/db/queries";
import {
  findOrCreateInstrument,
  isOnWatchlist,
} from "@/lib/db/watchlist";
import { PriceChart } from "@/components/PriceChart";
import { NewsFeed } from "@/components/NewsFeed";
import { SentimentBadge } from "@/components/SentimentBadge";
import { WatchlistButton } from "@/components/WatchlistButton";
import { Cash } from "@/components/Cash";
import { TopBar } from "@/components/ui/TopBar";
import { TickerIcon } from "@/components/ui/TickerIcon";
import { Section } from "@/components/ui/Section";
import { formatPct, formatQuantity } from "@/lib/format";
import { getFxRate } from "@/lib/fx/rates";

export const dynamic = "force-dynamic";

type YahooQuote = {
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
  regularMarketChange?: number;
  currency?: string;
  longName?: string;
  shortName?: string;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  marketCap?: number;
};

export default async function TickerPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol: raw } = await params;
  const symbol = decodeURIComponent(raw).toUpperCase();
  if (!/^[A-Z0-9.\-]{1,12}$/.test(symbol)) notFound();

  const userId = await ensureUserRow();

  // Live quote
  let quote: YahooQuote | null = null;
  try {
    quote = (await yahooFinance.quote(symbol)) as YahooQuote | null;
  } catch {}

  // Determine asset kind for instrument upsert
  const kind: "EQUITY" | "EXCHANGE_TRADED_FUND" | "CRYPTOCURRENCY" | "OTHER" =
    "EQUITY";

  // Ensure an instrument row exists so we can map watchlist + future caches.
  const instrumentId = await findOrCreateInstrument({
    symbol,
    name: quote?.longName ?? quote?.shortName ?? null,
    kind,
  });
  const watching = await isOnWatchlist(userId, instrumentId);

  // User's positions in this symbol (across accounts; options on the same
  // underlying included).
  const positions = await getPositionsForSymbol(userId, symbol);

  // Combine all positions to a single CAD-summarised "your position".
  const fxCache = new Map<string, number>();
  async function fx(ccy: string): Promise<number> {
    if (fxCache.has(ccy)) return fxCache.get(ccy)!;
    try {
      const r = await getFxRate(ccy, "CAD");
      fxCache.set(ccy, r);
      return r;
    } catch {
      const fallback = ccy === "CAD" ? 1 : 1;
      fxCache.set(ccy, fallback);
      return fallback;
    }
  }
  let totalValueCad = 0;
  let totalCostCad = 0;
  for (const p of positions) {
    const r = await fx(p.marketValueNativeCurrency);
    totalValueCad += parseFloat(p.marketValueNative) * r;
    totalCostCad += parseFloat(p.bookValueCad);
  }
  const totalReturnCad = totalValueCad - totalCostCad;
  const totalReturnPct =
    totalCostCad > 0 ? (totalReturnCad / totalCostCad) * 100 : 0;

  const price = quote?.regularMarketPrice;
  const dayPct = quote?.regularMarketChangePercent;
  const dayAbs = quote?.regularMarketChange;
  const ccy = quote?.currency ?? "USD";
  const dayPos = (dayPct ?? 0) >= 0;

  return (
    <>
      <TopBar title={symbol} back="/home" />
      <div className="space-y-6 pt-2">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <TickerIcon symbol={symbol} size={56} />
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">{symbol}</h1>
            <p className="text-sm text-[color:var(--color-fg-muted)]">
              {quote?.longName ?? quote?.shortName ?? ""}
            </p>
            {price != null && (
              <div className="mt-2 flex items-baseline gap-3">
                <span className="num text-2xl font-bold">
                  {price.toFixed(2)} {ccy}
                </span>
                {dayPct != null && (
                  <span
                    className="num text-sm font-semibold"
                    style={{
                      color: dayPos
                        ? "var(--color-positive)"
                        : "var(--color-negative)",
                    }}
                  >
                    {dayAbs != null
                      ? `${dayAbs >= 0 ? "+" : ""}${dayAbs.toFixed(2)} `
                      : ""}
                    ({formatPct(dayPct, { sign: true })})
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <WatchlistButton
          initialOn={watching}
          instrumentId={instrumentId}
          symbol={symbol}
          exchange=""
          name={quote?.longName ?? quote?.shortName ?? null}
          kind={kind}
        />
      </div>

      <PriceChart symbol={symbol} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {positions.length > 0 && (
            <Section subhead="What you own" title="Your position">
              <section className="card p-5">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Value">
                  <Cash amount={totalValueCad} />
                </Stat>
                <Stat label="Cost">
                  <Cash amount={totalCostCad} />
                </Stat>
                <Stat label="Return">
                  <span
                    style={{
                      color:
                        totalReturnCad >= 0
                          ? "var(--color-positive)"
                          : "var(--color-negative)",
                    }}
                  >
                    <Cash amount={totalReturnCad} delta cents />{" "}
                    ({formatPct(totalReturnPct, { sign: true })})
                  </span>
                </Stat>
                <Stat label="Lots">
                  {positions.length}{" "}
                  <span className="text-xs text-[color:var(--color-fg-subtle)]">
                    {positions.some((p) => p.securityType === "OPTION")
                      ? "(incl. options)"
                      : ""}
                  </span>
                </Stat>
              </div>
              <ul className="mt-4 space-y-1 text-sm">
                {positions.map((p) => (
                  <li
                    key={p.positionId}
                    className="flex items-baseline justify-between border-t border-[color:var(--color-border)]/50 pt-2 first:border-0 first:pt-0"
                  >
                    <span>
                      <span className="pill mr-2 text-xs">
                        {p.accountClassification}
                      </span>
                      {p.securityType === "OPTION" ? (
                        <span className="text-[color:var(--color-fg-muted)]">
                          {p.optionType} ${p.optionStrike
                            ? parseFloat(p.optionStrike).toFixed(0)
                            : "?"}{" "}
                          exp {p.optionExpiry}
                        </span>
                      ) : (
                        <span className="text-[color:var(--color-fg-muted)]">
                          {formatQuantity(p.quantity)} {p.symbol}
                        </span>
                      )}
                    </span>
                    <span className="num text-[color:var(--color-fg-muted)]">
                      {parseFloat(p.marketValueNative).toFixed(2)}{" "}
                      {p.marketValueNativeCurrency}
                    </span>
                  </li>
                ))}
              </ul>
              </section>
            </Section>
          )}
          <NewsFeed symbol={symbol} />
        </div>
        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="text-sm font-medium text-[color:var(--color-fg-muted)]">
              Social sentiment
            </h2>
            <div className="mt-3">
              <SentimentBadge symbol={symbol} />
            </div>
          </section>
          {quote && (
            <section className="card p-5">
              <h2 className="text-sm font-medium text-[color:var(--color-fg-muted)]">
                Stats
              </h2>
              <dl className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
                <KeyValue
                  k="52-week high"
                  v={
                    quote.fiftyTwoWeekHigh
                      ? quote.fiftyTwoWeekHigh.toFixed(2)
                      : "—"
                  }
                />
                <KeyValue
                  k="52-week low"
                  v={
                    quote.fiftyTwoWeekLow
                      ? quote.fiftyTwoWeekLow.toFixed(2)
                      : "—"
                  }
                />
                <KeyValue
                  k="Market cap"
                  v={
                    quote.marketCap
                      ? compactNumber(quote.marketCap, ccy)
                      : "—"
                  }
                />
                <KeyValue k="Currency" v={ccy} />
              </dl>
            </section>
          )}
        </div>
      </div>
      </div>
    </>
  );
}

function Stat({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-[color:var(--color-fg-subtle)]">
        {label}
      </p>
      <p className="num mt-1 text-sm">{children}</p>
    </div>
  );
}

function KeyValue({ k, v }: { k: string; v: string }) {
  return (
    <>
      <dt className="text-[color:var(--color-fg-subtle)]">{k}</dt>
      <dd className="num text-right">{v}</dd>
    </>
  );
}

function compactNumber(n: number, ccy: string): string {
  const sign = n < 0 ? "−" : "";
  const abs = Math.abs(n);
  let s: string;
  if (abs >= 1e12) s = `${(abs / 1e12).toFixed(2)}T`;
  else if (abs >= 1e9) s = `${(abs / 1e9).toFixed(2)}B`;
  else if (abs >= 1e6) s = `${(abs / 1e6).toFixed(2)}M`;
  else s = abs.toFixed(0);
  return `${sign}${s} ${ccy}`;
}
