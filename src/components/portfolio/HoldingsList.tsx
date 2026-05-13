"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { TickerIcon } from "@/components/ui/TickerIcon";
import { Cash } from "@/components/Cash";
import { PillTabs } from "@/components/ui/PillTabs";
import { formatPct, formatQuantity } from "@/lib/format";
import { tickerHref } from "@/lib/markets/symbol";
import type { HoldingRow } from "@/lib/db/queries";

type Tab = "ALL" | "EQUITY" | "EXCHANGE_TRADED_FUND" | "CRYPTOCURRENCY";

export function HoldingsList({
  holdings,
  fxRates,
}: {
  holdings: HoldingRow[];
  fxRates: Record<string, number>;
}) {
  const [tab, setTab] = useState<Tab>("ALL");
  const cad = (r: HoldingRow) => {
    const fx = fxRates[r.marketValueNativeCurrency];
    return typeof fx === "number" ? parseFloat(r.marketValueNative) * fx : NaN;
  };
  const filtered = useMemo(() => {
    const base =
      tab === "ALL"
        ? holdings.filter((h) => h.securityType !== "OPTION")
        : holdings.filter((h) => h.securityType === tab);
    return [...base].sort((a, b) => cad(b) - cad(a));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, holdings, fxRates]);

  return (
    <div className="space-y-3">
      <PillTabs
        size="sm"
        tabs={[
          { id: "ALL", label: "All" },
          { id: "EQUITY", label: "Stocks" },
          { id: "EXCHANGE_TRADED_FUND", label: "ETFs" },
          { id: "CRYPTOCURRENCY", label: "Crypto" },
        ]}
        value={tab}
        onChange={setTab}
      />
      <div className="card divide-y divide-[color:var(--color-border)] overflow-hidden">
        {filtered.map((h) => {
          const value = cad(h);
          const cost = parseFloat(h.bookValueCad);
          const ret = value - cost;
          const retPct = cost > 0 ? (ret / cost) * 100 : 0;
          const pos = ret >= 0;
          return (
            <Link
              key={h.positionId}
              href={tickerHref({
                symbol: h.symbol,
                exchange: h.exchange,
                name: h.name,
                securityType: h.securityType,
              })}
              className="flex items-center gap-3 px-4 py-3 transition hover:bg-[color:var(--color-surface-2)]/40"
            >
              <TickerIcon symbol={h.symbol} size={36} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold">{h.symbol}</span>
                  <span className="pill text-[10px]">
                    {h.accountClassification}
                  </span>
                </div>
                {h.name && (
                  <div className="truncate text-xs text-[color:var(--color-fg-muted)]">
                    {h.name}
                  </div>
                )}
                <div className="num mt-0.5 text-xs text-[color:var(--color-fg-subtle)]">
                  {formatQuantity(h.quantity)} @ {parseFloat(h.marketPrice).toFixed(2)} {h.marketPriceCurrency}
                </div>
              </div>
              <div className="text-right">
                <div className="num text-sm font-semibold">
                  <Cash amount={value} />
                </div>
                <div
                  className="num text-xs"
                  style={{
                    color: pos
                      ? "var(--color-positive)"
                      : "var(--color-negative)",
                  }}
                >
                  {formatPct(retPct, { sign: true })}
                </div>
              </div>
            </Link>
          );
        })}
        {filtered.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-[color:var(--color-fg-subtle)]">
            No positions in this category.
          </p>
        )}
      </div>
    </div>
  );
}
