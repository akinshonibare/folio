import Link from "next/link";
import { Sparkline } from "@/components/ui/Sparkline";
import { formatPct } from "@/lib/format";
import type { IndexQuote } from "@/lib/markets/indices";

export function IndexCard({ q }: { q: IndexQuote }) {
  const pos = (q.changePct ?? 0) >= 0;
  return (
    <Link
      href={`/t/${encodeURIComponent(q.symbol)}`}
      className="w-[150px] rounded-2xl bg-[color:var(--color-surface)] p-3"
    >
      <div className="text-[12px] font-semibold text-[color:var(--color-fg)]">
        {q.label}
      </div>
      <div className="num mt-1 text-base font-bold">
        {q.price != null
          ? q.price.toLocaleString(undefined, { maximumFractionDigits: 2 })
          : "—"}
      </div>
      <div
        className="num text-xs font-semibold"
        style={{
          color: pos ? "var(--color-positive)" : "var(--color-negative)",
        }}
      >
        {q.changePct != null ? formatPct(q.changePct, { sign: true }) : "—"}
      </div>
      <div className="mt-2 h-9">
        <Sparkline
          values={q.spark}
          width={130}
          height={32}
          tone={pos ? "positive" : "negative"}
          showZero={false}
        />
      </div>
    </Link>
  );
}
