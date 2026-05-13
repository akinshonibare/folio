import Link from "next/link";
import { Star } from "lucide-react";
import { TickerIcon } from "@/components/ui/TickerIcon";
import { formatPct } from "@/lib/format";

type Card = {
  symbol: string;
  name: string | null;
  price: number | null;
  currency?: string | null;
  changePct: number | null;
};

export function TrendingScroll({ items }: { items: Card[] }) {
  if (items.length === 0) {
    return (
      <p className="px-1 text-sm text-[color:var(--color-fg-subtle)]">
        Trending unavailable right now.
      </p>
    );
  }
  return (
    <div className="h-scroll -mx-4 px-4">
      {items.map((c) => (
        <Link
          key={c.symbol}
          href={`/t/${encodeURIComponent(c.symbol)}`}
          className="w-[160px] rounded-2xl bg-[color:var(--color-surface)] p-4 transition hover:bg-[color:var(--color-surface-2)]"
        >
          <div className="flex items-start justify-between">
            <TickerIcon symbol={c.symbol} size={32} />
            <Star
              size={15}
              className="text-[color:var(--color-fg-subtle)]"
            />
          </div>
          <p className="mt-3 font-bold leading-tight">{c.symbol}</p>
          {c.name && (
            <p className="truncate text-xs text-[color:var(--color-fg-muted)]">
              {c.name}
            </p>
          )}
          {c.changePct != null && (
            <p
              className="num mt-3 text-sm font-semibold"
              style={{
                color:
                  c.changePct >= 0
                    ? "var(--color-positive)"
                    : "var(--color-negative)",
              }}
            >
              {formatPct(c.changePct, { sign: true })}
            </p>
          )}
        </Link>
      ))}
    </div>
  );
}
