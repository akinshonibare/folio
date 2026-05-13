import Link from "next/link";
import { TickerIcon } from "@/components/ui/TickerIcon";

export type MoverBar = {
  symbol: string;
  changePct: number;
};

/**
 * Delta-style vertical bar visualization of the day's top |Δ%| movers.
 * Greens go up, reds go down. Magnitudes are scaled to the largest absolute
 * percentage in the set.
 */
export function DailyMoversBars({ items }: { items: MoverBar[] }) {
  const top = [...items]
    .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
    .slice(0, 6);
  if (top.length === 0) {
    return (
      <div className="card p-5 text-sm text-[color:var(--color-fg-subtle)]">
        Upload another snapshot to see your daily movers.
      </div>
    );
  }
  const max = Math.max(...top.map((t) => Math.abs(t.changePct)));
  return (
    <div className="card px-4 pt-5 pb-3">
      <div className="flex h-44 items-end justify-between gap-2 sm:gap-3">
        {top.map((m) => {
          const h = max > 0 ? (Math.abs(m.changePct) / max) * 100 : 0;
          const pos = m.changePct >= 0;
          return (
            <Link
              key={m.symbol}
              href={`/t/${encodeURIComponent(m.symbol)}`}
              className="flex w-12 flex-col items-center text-center sm:w-14"
            >
              <span
                className="num text-[11px] font-semibold"
                style={{
                  color: pos
                    ? "var(--color-positive)"
                    : "var(--color-negative)",
                }}
              >
                {pos ? "+" : ""}
                {m.changePct.toFixed(2)}%
              </span>
              <div className="mt-1 flex h-28 w-full items-end">
                <span
                  className="w-full rounded-md"
                  style={{
                    height: `${Math.max(h, 6)}%`,
                    background: pos
                      ? "linear-gradient(180deg, #14F067 0%, #08AF45 100%)"
                      : "linear-gradient(180deg, #FF5560 0%, #B5202A 100%)",
                  }}
                />
              </div>
            </Link>
          );
        })}
      </div>
      <div className="mt-3 flex justify-between gap-2 sm:gap-3">
        {top.map((m) => (
          <Link
            key={`label-${m.symbol}`}
            href={`/t/${encodeURIComponent(m.symbol)}`}
            className="flex w-12 flex-col items-center sm:w-14"
          >
            <TickerIcon symbol={m.symbol} size={26} />
            <span className="mt-1 text-[11px] font-semibold">{m.symbol}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
