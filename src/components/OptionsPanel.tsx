"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Cash } from "./Cash";
import { daysUntil, formatQuantity } from "@/lib/format";
import type { HoldingRow } from "@/lib/db/queries";
import type { LivePosition } from "@/lib/portfolio/live";

/**
 * Delta-style per-contract cards. Each card shows: underlying, strike,
 * expiry, DTE pill, contracts, premium captured (book cost), current value,
 * P/L.
 *
 * Live options pricing + Greeks remain on the Polygon roadmap. Until then,
 * value comes from broker-uploaded market price (per share, ×100 contracts
 * for the position MV).
 */
export function OptionsPanel({
  holdings,
  liveByPosition,
}: {
  holdings: HoldingRow[];
  liveByPosition: Map<number, LivePosition>;
}) {
  const options = useMemo(
    () => holdings.filter((h) => h.securityType === "OPTION"),
    [holdings],
  );

  if (options.length === 0) {
    return null;
  }

  const sorted = [...options].sort((a, b) => {
    const ad = a.optionExpiry ? daysUntil(a.optionExpiry) : 9999;
    const bd = b.optionExpiry ? daysUntil(b.optionExpiry) : 9999;
    return ad - bd;
  });

  return (
    <section className="card">
      <div className="flex items-center justify-between border-b border-[color:var(--color-border)] px-5 py-3">
        <h2 className="text-sm font-medium text-[color:var(--color-fg-muted)]">
          Options ({options.length})
        </h2>
        <span className="text-xs text-[color:var(--color-fg-subtle)]">
          sorted by expiry · prices from your last CSV
        </span>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((o) => (
          <OptionCard
            key={o.positionId}
            opt={o}
            live={liveByPosition.get(o.positionId)}
          />
        ))}
      </div>
    </section>
  );
}

function OptionCard({
  opt,
  live,
}: {
  opt: HoldingRow;
  live: LivePosition | undefined;
}) {
  const dte = opt.optionExpiry ? daysUntil(opt.optionExpiry) : null;
  const strike = opt.optionStrike ? parseFloat(opt.optionStrike) : null;
  const qty = parseFloat(opt.quantity);
  const valueCad = live?.liveValueCad ?? NaN;
  const costCad = parseFloat(opt.bookValueCad);
  const ret = Number.isFinite(valueCad) ? valueCad - costCad : NaN;
  const retPct =
    Number.isFinite(ret) && costCad > 0 ? (ret / costCad) * 100 : 0;
  const pos = ret >= 0;

  const expiringSoon = dte !== null && dte <= 14;
  const expired = dte !== null && dte < 0;

  return (
    <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)]/50 p-4">
      <div className="flex items-baseline justify-between">
        <Link
          href={`/t/${encodeURIComponent(opt.optionUnderlying ?? "")}`}
          className="transition hover:text-[color:var(--color-accent)]"
        >
          <div className="text-lg font-semibold">{opt.optionUnderlying}</div>
          <div className="text-xs text-[color:var(--color-fg-subtle)]">
            {opt.accountClassification} · {opt.optionType}
            {strike !== null && ` · $${strike.toLocaleString()}`}
          </div>
        </Link>
        {dte !== null && (
          <span
            className="pill text-xs"
            style={
              expired
                ? {
                    background:
                      "color-mix(in oklch, var(--color-negative) 18%, transparent)",
                    color: "var(--color-negative)",
                  }
                : expiringSoon
                ? {
                    background:
                      "color-mix(in oklch, var(--color-warning) 18%, transparent)",
                    color: "var(--color-warning)",
                  }
                : undefined
            }
            title={`Expires ${opt.optionExpiry}`}
          >
            {expired ? "expired" : `${dte}d`}
          </span>
        )}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <Stat label="Contracts" value={formatQuantity(qty)} />
        <Stat
          label="Premium/sh"
          value={`$${parseFloat(opt.marketPrice).toFixed(2)}`}
        />
        <Stat label="Cost" value={<Cash amount={costCad} />} />
        <Stat label="Value" value={<Cash amount={valueCad} />} />
      </div>
      <div className="mt-3 border-t border-[color:var(--color-border)] pt-2">
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-[color:var(--color-fg-muted)]">P/L</span>
          <span
            className="num"
            style={{
              color: pos ? "var(--color-positive)" : "var(--color-negative)",
            }}
          >
            <Cash amount={ret} delta cents /> ({retPct >= 0 ? "+" : ""}
            {retPct.toFixed(1)}%)
          </span>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <>
      <span className="text-[color:var(--color-fg-subtle)]">{label}</span>
      <span className="num text-right">{value}</span>
    </>
  );
}
