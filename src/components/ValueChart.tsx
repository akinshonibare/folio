"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useStealth } from "./StealthContext";
import { useCurrency, toDisplay } from "./CurrencyContext";

export type ValuePoint = { date: string; valueCad: number };

export function ValueChart({ data }: { data: ValuePoint[] }) {
  const { stealth } = useStealth();
  const ctx = useCurrency();
  // Recharts wants raw numbers; convert each point's CAD-stored value into the
  // user's chosen display currency before charting.
  const display = data.map((d) => ({
    date: d.date,
    valueDisplay: toDisplay(d.valueCad, ctx),
  }));

  if (data.length < 2) {
    return (
      <section className="card p-5">
        <h2 className="text-sm font-medium text-[color:var(--color-fg-muted)]">
          Portfolio value over time
        </h2>
        <p className="mt-3 text-sm text-[color:var(--color-fg-subtle)]">
          Upload more snapshots over time to see your portfolio trajectory.
        </p>
      </section>
    );
  }

  const first = display[0].valueDisplay;
  const last = display[display.length - 1].valueDisplay;
  const isUp = last >= first;
  const stroke = isUp ? "var(--color-positive)" : "var(--color-negative)";

  return (
    <section className="card p-5">
      <h2 className="text-sm font-medium text-[color:var(--color-fg-muted)]">
        Portfolio value over time
      </h2>
      <div className="mt-2 h-56">
        <ResponsiveContainer>
          <AreaChart data={display} margin={{ top: 6, right: 6, left: 6, bottom: 0 }}>
            <defs>
              <linearGradient id="vcGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
                <stop offset="100%" stopColor={stroke} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" hide />
            <YAxis
              domain={["dataMin", "dataMax"]}
              tick={{ fill: "var(--color-fg-subtle)", fontSize: 11 }}
              tickFormatter={(v) =>
                stealth
                  ? "•••"
                  : typeof v === "number"
                  ? `${Math.round(v / 1000)}k`
                  : v
              }
              width={48}
            />
            {!stealth && (
              <Tooltip
                contentStyle={{
                  background: "var(--color-surface-2)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: "var(--color-fg-muted)" }}
              />
            )}
            <Area
              type="monotone"
              dataKey="valueDisplay"
              stroke={stroke}
              strokeWidth={2}
              fill="url(#vcGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
