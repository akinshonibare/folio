"use client";

import { Cash } from "./Cash";
import { formatPct } from "@/lib/format";
import type { MovementRow } from "@/lib/portfolio/aggregate";

export function Movers({ rows }: { rows: MovementRow[] }) {
  const ranked = rows.filter((r) => r.previousValueCad > 0);
  const gainers = ranked.filter((r) => r.deltaCad > 0).slice(0, 5);
  const losers = ranked
    .filter((r) => r.deltaCad < 0)
    .sort((a, b) => a.deltaCad - b.deltaCad)
    .slice(0, 5);

  if (rows.length === 0 || (gainers.length === 0 && losers.length === 0)) {
    return (
      <section className="card p-5">
        <h2 className="text-sm font-medium text-[color:var(--color-fg-muted)]">
          Movers
        </h2>
        <p className="mt-3 text-sm text-[color:var(--color-fg-subtle)]">
          Upload a second CSV to see day-over-day movement.
        </p>
      </section>
    );
  }

  return (
    <section className="card p-5">
      <h2 className="text-sm font-medium text-[color:var(--color-fg-muted)]">
        Movers
      </h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <div>
          <div className="text-xs uppercase tracking-wider text-[color:var(--color-fg-subtle)]">
            Gainers
          </div>
          <ul className="mt-2 space-y-1.5">
            {gainers.map((m) => (
              <Row key={m.instrumentId} m={m} />
            ))}
            {gainers.length === 0 && (
              <li className="text-sm text-[color:var(--color-fg-subtle)]">—</li>
            )}
          </ul>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-[color:var(--color-fg-subtle)]">
            Losers
          </div>
          <ul className="mt-2 space-y-1.5">
            {losers.map((m) => (
              <Row key={m.instrumentId} m={m} />
            ))}
            {losers.length === 0 && (
              <li className="text-sm text-[color:var(--color-fg-subtle)]">—</li>
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Row({ m }: { m: MovementRow }) {
  const pos = m.deltaCad >= 0;
  const color = pos ? "var(--color-positive)" : "var(--color-negative)";
  return (
    <li className="flex items-baseline justify-between text-sm">
      <span className="font-medium">{m.symbol}</span>
      <span className="flex items-baseline gap-2">
        <span className="num text-xs text-[color:var(--color-fg-subtle)]">
          <Cash amount={m.deltaCad} delta cents />
        </span>
        <span className="num" style={{ color }}>
          {formatPct(m.deltaPct, { sign: true })}
        </span>
      </span>
    </li>
  );
}
