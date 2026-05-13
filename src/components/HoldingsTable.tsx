"use client";

import { useMemo, useState } from "react";
import { Cash } from "./Cash";
import { formatPct, formatQuantity } from "@/lib/format";
import type { HoldingRow } from "@/lib/db/queries";

type Tab = "ALL" | "EQUITY" | "EXCHANGE_TRADED_FUND" | "CRYPTOCURRENCY";

const TABS: { id: Tab; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "EQUITY", label: "Stocks" },
  { id: "EXCHANGE_TRADED_FUND", label: "ETFs" },
  { id: "CRYPTOCURRENCY", label: "Crypto" },
];

export function HoldingsTable({
  holdings,
  fxRates,
}: {
  holdings: HoldingRow[];
  fxRates: Record<string, number>;
}) {
  const [tab, setTab] = useState<Tab>("ALL");
  const cad = (r: HoldingRow) => {
    const fx = fxRates[r.marketValueNativeCurrency];
    return typeof fx === "number"
      ? parseFloat(r.marketValueNative) * fx
      : NaN;
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
    <section className="card">
      <div className="flex items-center justify-between border-b border-[color:var(--color-border)] px-5 py-3">
        <h2 className="text-sm font-medium text-[color:var(--color-fg-muted)]">
          Holdings
        </h2>
        <div className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-full px-3 py-1 text-xs transition ${
                tab === t.id
                  ? "bg-[color:var(--color-surface-2)] text-[color:var(--color-fg)]"
                  : "text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-[color:var(--color-fg-subtle)]">
            <tr>
              <th className="px-5 py-2 text-left font-medium">Symbol</th>
              <th className="px-3 py-2 text-left font-medium">Account</th>
              <th className="px-3 py-2 text-right font-medium">Qty</th>
              <th className="px-3 py-2 text-right font-medium">Price</th>
              <th className="px-3 py-2 text-right font-medium">Value (CAD)</th>
              <th className="px-5 py-2 text-right font-medium">Return</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((h) => {
              const value = cad(h);
              const cost = parseFloat(h.bookValueCad);
              const ret = value - cost;
              const retPct = cost > 0 ? (ret / cost) * 100 : 0;
              const pos = ret >= 0;
              return (
                <tr
                  key={h.positionId}
                  className="border-t border-[color:var(--color-border)]/60 transition hover:bg-[color:var(--color-surface-2)]/40"
                >
                  <td className="px-5 py-3">
                    <div className="font-medium">{h.symbol}</div>
                    {h.name && (
                      <div className="text-xs text-[color:var(--color-fg-subtle)]">
                        {h.name}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span className="pill text-xs">{h.accountClassification}</span>
                  </td>
                  <td className="num px-3 py-3 text-right">
                    {formatQuantity(h.quantity)}
                  </td>
                  <td className="num px-3 py-3 text-right text-[color:var(--color-fg-muted)]">
                    {parseFloat(h.marketPrice).toFixed(2)} {h.marketPriceCurrency}
                  </td>
                  <td className="num px-3 py-3 text-right">
                    <Cash amount={value} />
                  </td>
                  <td
                    className="num px-5 py-3 text-right"
                    style={{
                      color: pos
                        ? "var(--color-positive)"
                        : "var(--color-negative)",
                    }}
                  >
                    {formatPct(retPct, { sign: true })}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-[color:var(--color-fg-muted)]">
                  No positions in this category.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
