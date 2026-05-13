import { TickerRow } from "@/components/ui/TickerRow";
import type { Mover } from "@/lib/markets/movers";

export function MoversList({
  items,
  emptyMessage = "Nothing to show.",
}: {
  items: Mover[];
  emptyMessage?: string;
}) {
  if (items.length === 0) {
    return (
      <div className="card p-5 text-sm text-[color:var(--color-fg-subtle)]">
        {emptyMessage}
      </div>
    );
  }
  return (
    <div className="card divide-y divide-[color:var(--color-border)] overflow-hidden">
      {items.map((m) => (
        <TickerRow
          key={m.symbol}
          symbol={m.symbol}
          name={m.name}
          price={m.price}
          currency={m.currency}
          changeAbs={m.changeAbs}
          changePct={m.changePct}
        />
      ))}
    </div>
  );
}
