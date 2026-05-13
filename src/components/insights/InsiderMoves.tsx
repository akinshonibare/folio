import Link from "next/link";
import type { InsiderRow } from "@/lib/db/calendar";
import { TickerIcon } from "@/components/ui/TickerIcon";
import { tickerHref } from "@/lib/markets/symbol";

export function InsiderMoves({ rows }: { rows: InsiderRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="card p-5 text-sm text-[color:var(--color-fg-subtle)]">
        No recent insider transactions for tickers you hold. (The nightly cron
        refreshes this daily; until it's first populated, it'll stay empty.)
      </div>
    );
  }
  return (
    <div className="card divide-y divide-[color:var(--color-border)] overflow-hidden">
      {rows.map((r, i) => {
        const isBuy = r.change > 0;
        const valueUsd = Math.abs(r.change) * r.price;
        const valueStr = compact(valueUsd);
        return (
          <Link
            key={`${r.symbol}-${r.transactionDate}-${r.insiderName}-${i}`}
            href={tickerHref({ symbol: r.symbol })}
            className="flex items-center gap-3 px-4 py-3 transition hover:bg-[color:var(--color-surface-2)]/40"
          >
            <TickerIcon symbol={r.symbol} size={30} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="font-semibold">{r.symbol}</span>
                <span className="text-xs text-[color:var(--color-fg-subtle)]">
                  {r.transactionDate}
                </span>
              </div>
              <p className="truncate text-xs text-[color:var(--color-fg-muted)]">
                {r.insiderName} · {r.code}
              </p>
            </div>
            <div className="text-right">
              <p
                className="num text-sm font-semibold"
                style={{
                  color: isBuy
                    ? "var(--color-positive)"
                    : "var(--color-negative)",
                }}
              >
                {isBuy ? "+" : "−"}${valueStr}
              </p>
              <p className="num text-[10px] uppercase tracking-wider text-[color:var(--color-fg-subtle)]">
                {isBuy ? "buy" : "sell"}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function compact(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(0);
}
