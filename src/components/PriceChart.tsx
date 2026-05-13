"use client";

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Range = "1W" | "1M" | "3M" | "1Y" | "ALL";
const RANGES: Range[] = ["1W", "1M", "3M", "1Y", "ALL"];

type Point = { date: string; close: number };

export function PriceChart({ symbol }: { symbol: string }) {
  const [range, setRange] = useState<Range>("3M");
  const [data, setData] = useState<Point[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/history/${encodeURIComponent(symbol)}?range=${range}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        setData(j.data ?? []);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setData([]);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [symbol, range]);

  const first = data?.[0]?.close;
  const last = data?.[data.length - 1]?.close;
  const isUp =
    typeof first === "number" && typeof last === "number" ? last >= first : true;
  const stroke = isUp ? "var(--color-positive)" : "var(--color-negative)";

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-full px-3 py-1 text-xs transition ${
                range === r
                  ? "bg-[color:var(--color-surface-2)] text-[color:var(--color-fg)]"
                  : "text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)]"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4 h-64 sm:h-80">
        {loading ? (
          <Placeholder text="Loading…" />
        ) : data && data.length > 1 ? (
          <ResponsiveContainer>
            <AreaChart data={data} margin={{ top: 6, right: 6, left: 6, bottom: 0 }}>
              <defs>
                <linearGradient id="pcGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={stroke} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={stroke} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                hide
              />
              <YAxis
                domain={["dataMin", "dataMax"]}
                tick={{ fill: "var(--color-fg-subtle)", fontSize: 11 }}
                tickFormatter={(v) => (typeof v === "number" ? v.toFixed(0) : v)}
                width={48}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--color-surface-2)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: "var(--color-fg-muted)" }}
              />
              <Area
                type="monotone"
                dataKey="close"
                stroke={stroke}
                strokeWidth={2}
                fill="url(#pcGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <Placeholder text="No price history available for this symbol." />
        )}
      </div>
    </div>
  );
}

function Placeholder({ text }: { text: string }) {
  return (
    <div className="flex h-full items-center justify-center text-sm text-[color:var(--color-fg-subtle)]">
      {text}
    </div>
  );
}
