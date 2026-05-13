import Link from "next/link";
import { TickerIcon } from "./TickerIcon";
import { Sparkline } from "./Sparkline";
import { formatPct } from "@/lib/format";

/**
 * The dense ticker row used in Most Active, Top Gainers/Losers, Following,
 * etc. Tap-target is the whole row; the symbol links to /t/[symbol].
 */
export function TickerRow({
  symbol,
  name,
  price,
  currency,
  changeAbs,
  changePct,
  spark,
  preMarket,
}: {
  symbol: string;
  name: string | null;
  price: number | null;
  currency: string | null;
  changeAbs: number | null;
  changePct: number | null;
  spark?: number[];
  preMarket?: { price: number; changeAbs: number; changePct: number };
}) {
  const pos = (changePct ?? 0) >= 0;
  const tone: "positive" | "negative" = pos ? "positive" : "negative";
  return (
    <Link
      href={`/t/${encodeURIComponent(symbol)}`}
      className="flex items-center gap-3 px-4 py-3 transition hover:bg-[color:var(--color-surface-2)]/50"
    >
      <TickerIcon symbol={symbol} size={36} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-semibold leading-tight">
          {symbol}
        </div>
        {name && (
          <div className="truncate text-xs text-[color:var(--color-fg-muted)]">
            {name}
          </div>
        )}
      </div>
      {spark && spark.length > 1 && (
        <div className="hidden sm:block">
          <Sparkline values={spark} tone={tone} />
        </div>
      )}
      <div className="text-right">
        <div className="num text-[15px] font-semibold">
          {price != null ? price.toFixed(2) : "—"}{" "}
          {currency && (
            <span className="text-xs text-[color:var(--color-fg-subtle)]">
              {currency}
            </span>
          )}
        </div>
        <div
          className="num text-xs"
          style={{
            color: pos ? "var(--color-positive)" : "var(--color-negative)",
          }}
        >
          {changeAbs != null && (
            <span>
              {changeAbs >= 0 ? "+" : ""}
              {changeAbs.toFixed(2)}{" "}
            </span>
          )}
          {changePct != null && (
            <span className="font-semibold">
              {formatPct(changePct, { sign: true })}
            </span>
          )}
        </div>
        {preMarket && (
          <div className="num mt-0.5 text-[10px] text-[color:var(--color-fg-subtle)]">
            (pre) {preMarket.changeAbs >= 0 ? "+" : ""}
            {preMarket.changeAbs.toFixed(2)} ·{" "}
            {formatPct(preMarket.changePct, { sign: true })}
          </div>
        )}
      </div>
    </Link>
  );
}
