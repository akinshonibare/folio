"use client";

import { useMemo, useState } from "react";
import { PillTabs } from "@/components/ui/PillTabs";
import { TickerRow } from "@/components/ui/TickerRow";
import { ArrowUpDown, Star } from "lucide-react";

type Kind =
  | "all"
  | "crypto"
  | "stocks"
  | "funds"
  | "commodities"
  | "indices";

type Sort = "marketCap" | "alphabetical" | "biggestGain" | "biggestLoss";

export type FollowingItem = {
  id: number;
  symbol: string;
  exchange: string;
  name: string | null;
  securityType: string;
  graduated: boolean;
  price: number | null;
  currency: string | null;
  changeAbs: number | null;
  changePct: number | null;
  marketCap: number;
};

function classifyKind(it: FollowingItem): Exclude<Kind, "all"> {
  const st = (it.securityType ?? "").toUpperCase();
  if (st === "CRYPTOCURRENCY") return "crypto";
  if (st === "EXCHANGE_TRADED_FUND") return "funds";
  if (st === "PRECIOUS_METAL") return "commodities";
  if (it.symbol.startsWith("^")) return "indices";
  return "stocks";
}

export function FollowingList({ items }: { items: FollowingItem[] }) {
  const [kind, setKind] = useState<Kind>("all");
  const [sort, setSort] = useState<Sort>("marketCap");

  const filtered = useMemo(() => {
    const base =
      kind === "all"
        ? items
        : items.filter((i) => classifyKind(i) === kind);
    const cmpAlpha = (a: FollowingItem, b: FollowingItem) =>
      a.symbol.localeCompare(b.symbol);
    switch (sort) {
      case "alphabetical":
        return [...base].sort(cmpAlpha);
      case "biggestGain":
        return [...base].sort(
          (a, b) => (b.changePct ?? -Infinity) - (a.changePct ?? -Infinity),
        );
      case "biggestLoss":
        return [...base].sort(
          (a, b) => (a.changePct ?? Infinity) - (b.changePct ?? Infinity),
        );
      default:
        return [...base].sort((a, b) => b.marketCap - a.marketCap);
    }
  }, [items, kind, sort]);

  const sortLabel: Record<Sort, string> = {
    marketCap: "Highest Cap",
    alphabetical: "A → Z",
    biggestGain: "Biggest Gain",
    biggestLoss: "Biggest Loss",
  };

  return (
    <div className="space-y-3">
      <PillTabs
        size="sm"
        tabs={[
          { id: "all", label: "All" },
          { id: "crypto", label: "Crypto" },
          { id: "stocks", label: "Stocks" },
          { id: "funds", label: "Funds" },
          { id: "commodities", label: "Commodities" },
          { id: "indices", label: "Indices" },
        ]}
        value={kind}
        onChange={(v) => setKind(v as Kind)}
      />
      <div className="flex items-center justify-between gap-3">
        <SortMenu sort={sort} setSort={setSort} label={sortLabel[sort]} />
        <span className="text-xs text-[color:var(--color-fg-subtle)]">
          {filtered.length} of {items.length}
        </span>
      </div>
      {filtered.length === 0 ? (
        <div className="card p-6 text-center text-sm text-[color:var(--color-fg-muted)]">
          Nothing matches this filter.
        </div>
      ) : (
        <div className="card divide-y divide-[color:var(--color-border)] overflow-hidden">
          {filtered.map((it) => (
            <div key={it.id} className="relative">
              <TickerRow
                symbol={it.symbol}
                name={it.name}
                price={it.price}
                currency={it.currency}
                changeAbs={it.changeAbs}
                changePct={it.changePct}
              />
              {it.graduated && (
                <span className="pointer-events-none absolute right-28 top-1/2 -translate-y-1/2 hidden text-[10px] uppercase tracking-wider text-[color:var(--color-warning)] sm:inline">
                  <Star
                    size={10}
                    className="mr-1 inline"
                    fill="currentColor"
                  />
                  held
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SortMenu({
  sort,
  setSort,
  label,
}: {
  sort: Sort;
  setSort: (s: Sort) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const options: { id: Sort; label: string }[] = [
    { id: "marketCap", label: "Highest Cap" },
    { id: "alphabetical", label: "A → Z" },
    { id: "biggestGain", label: "Biggest Gain" },
    { id: "biggestLoss", label: "Biggest Loss" },
  ];
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full bg-[color:var(--color-surface-2)] px-3 py-1.5 text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)]"
      >
        <ArrowUpDown size={12} />
        <span>{label}</span>
      </button>
      {open && (
        <ul className="absolute left-0 top-full z-20 mt-1 w-44 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-1 shadow-2xl">
          {options.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                onClick={() => {
                  setSort(o.id);
                  setOpen(false);
                }}
                className={`block w-full rounded-lg px-3 py-1.5 text-left text-xs transition ${
                  sort === o.id
                    ? "bg-[color:var(--color-surface-2)] text-[color:var(--color-fg)]"
                    : "text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)]"
                }`}
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
