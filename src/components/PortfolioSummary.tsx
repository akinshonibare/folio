"use client";

import { Cash } from "./Cash";
import { formatPct } from "@/lib/format";
import type { PortfolioSummary } from "@/lib/portfolio/aggregate";

export function PortfolioSummaryCards({
  summary,
  dayDelta,
  dayDeltaPct,
}: {
  summary: PortfolioSummary;
  dayDelta: number | null;
  dayDeltaPct: number | null;
}) {
  const totalReturnPos = summary.totalReturnCad >= 0;
  const dayPos = (dayDelta ?? 0) >= 0;
  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Card label="Portfolio value">
        <div className="num mt-1 text-3xl font-semibold sm:text-4xl">
          <Cash amount={summary.totalCad} />
        </div>
        <Delta amount={summary.totalReturnCad} pct={summary.totalReturnPct} />
        <p className="mt-1 text-xs text-[color:var(--color-fg-subtle)]">
          since you started
        </p>
      </Card>
      <Card label="Today">
        <div className="num mt-1 text-2xl font-semibold sm:text-3xl">
          {dayDelta == null ? (
            <span className="text-[color:var(--color-fg-muted)]">—</span>
          ) : (
            <Cash amount={dayDelta} delta cents />
          )}
        </div>
        {dayDeltaPct != null && (
          <p
            className="num mt-1 text-sm"
            style={{
              color: dayPos
                ? "var(--color-positive)"
                : "var(--color-negative)",
            }}
          >
            {formatPct(dayDeltaPct, { sign: true })}
          </p>
        )}
        <p className="mt-1 text-xs text-[color:var(--color-fg-subtle)]">
          vs last snapshot
        </p>
      </Card>
      <Card label="Options exposure">
        <div className="num mt-1 text-2xl font-semibold sm:text-3xl">
          <Cash amount={summary.optionsExposureCad} />
        </div>
        <p className="mt-1 text-xs text-[color:var(--color-fg-subtle)]">
          long calls + puts, mark-to-market
        </p>
      </Card>
      <Card label="Crypto exposure">
        <div className="num mt-1 text-2xl font-semibold sm:text-3xl">
          <Cash amount={summary.cryptoExposureCad} />
        </div>
        <p className="mt-1 text-xs text-[color:var(--color-fg-subtle)]">
          {((summary.cryptoExposureCad / Math.max(summary.totalCad, 1)) * 100).toFixed(1)}
          % of portfolio
        </p>
      </Card>
    </section>
  );
}

function Card({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <div className="text-xs uppercase tracking-wider text-[color:var(--color-fg-subtle)]">
        {label}
      </div>
      {children}
    </div>
  );
}

function Delta({ amount, pct }: { amount: number; pct: number }) {
  const pos = amount >= 0;
  const color = pos ? "var(--color-positive)" : "var(--color-negative)";
  return (
    <div className="num mt-1 flex items-baseline gap-2 text-sm" style={{ color }}>
      <Cash amount={amount} delta cents />
      <span>({formatPct(pct, { sign: true })})</span>
    </div>
  );
}
