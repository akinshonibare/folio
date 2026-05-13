"use client";

import { Cash } from "@/components/Cash";
import { useStealth } from "@/components/StealthContext";
import { formatPct } from "@/lib/format";
import { Eye, EyeOff } from "lucide-react";

export function PortfolioHero({
  totalCad,
  totalReturnCad,
  totalReturnPct,
  dayDelta,
  dayDeltaPct,
  asOf,
  optionsCad,
  cryptoCad,
}: {
  totalCad: number;
  totalReturnCad: number;
  totalReturnPct: number;
  dayDelta: number | null;
  dayDeltaPct: number | null;
  asOf: Date;
  optionsCad: number;
  cryptoCad: number;
}) {
  const { stealth, toggle } = useStealth();
  const totalPos = totalReturnCad >= 0;
  const dayPos = (dayDelta ?? 0) >= 0;
  return (
    <div className="text-center pt-2">
      <p className="text-xs text-[color:var(--color-fg-muted)]">Total Worth</p>
      <div className="mt-2 flex items-center justify-center gap-3">
        <span className="num text-4xl font-bold tracking-tight sm:text-5xl">
          <Cash amount={totalCad} />
        </span>
        <button
          type="button"
          onClick={toggle}
          aria-label={stealth ? "Show" : "Hide"}
          className="rounded-full p-1 text-[color:var(--color-fg-muted)]"
        >
          {stealth ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>
      <p
        className="num mt-2 text-sm font-semibold"
        style={{
          color: totalPos ? "var(--color-positive)" : "var(--color-negative)",
        }}
      >
        <Cash amount={totalReturnCad} delta cents /> ({formatPct(totalReturnPct, { sign: true })}) all-time
      </p>
      {dayDelta != null && (
        <p
          className="num mt-0.5 text-xs font-medium"
          style={{
            color: dayPos
              ? "var(--color-positive)"
              : "var(--color-negative)",
          }}
        >
          <Cash amount={dayDelta} delta cents />{" "}
          {dayDeltaPct != null
            ? `(${formatPct(dayDeltaPct, { sign: true })}) `
            : ""}
          since last upload
        </p>
      )}
      <p className="mt-2 text-[11px] text-[color:var(--color-fg-subtle)]">
        as of{" "}
        {asOf.toLocaleString("en-CA", {
          dateStyle: "medium",
          timeStyle: "short",
        })}
      </p>
      <div className="mt-5 grid grid-cols-2 gap-3 text-left">
        <div className="card-row p-3">
          <p className="text-[11px] text-[color:var(--color-fg-subtle)]">Options exposure</p>
          <p className="num mt-1 text-lg font-semibold">
            <Cash amount={optionsCad} />
          </p>
        </div>
        <div className="card-row p-3">
          <p className="text-[11px] text-[color:var(--color-fg-subtle)]">Crypto exposure</p>
          <p className="num mt-1 text-lg font-semibold">
            <Cash amount={cryptoCad} />
          </p>
        </div>
      </div>
    </div>
  );
}
