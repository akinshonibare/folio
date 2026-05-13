"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Cash } from "./Cash";

const PALETTE = [
  "oklch(70% 0.18 270)",
  "oklch(76% 0.22 145)",
  "oklch(75% 0.18 50)",
  "oklch(72% 0.20 340)",
  "oklch(70% 0.16 200)",
  "oklch(74% 0.14 100)",
  "oklch(66% 0.20 30)",
];

export function AllocationDonut({
  byClassification,
}: {
  byClassification: Record<string, { value: number; cost: number; returnPct: number }>;
}) {
  const data = Object.entries(byClassification)
    .map(([name, v]) => ({ name, value: v.value, returnPct: v.returnPct }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <section className="card p-5">
      <h2 className="text-sm font-medium text-[color:var(--color-fg-muted)]">
        Allocation by account
      </h2>
      <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="h-44 w-44 shrink-0">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                innerRadius={50}
                outerRadius={75}
                paddingAngle={2}
                stroke="none"
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-2">
          {data.map((d, i) => (
            <div key={d.name} className="flex items-baseline gap-3 text-sm">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: PALETTE[i % PALETTE.length] }}
              />
              <span className="flex-1 text-[color:var(--color-fg-muted)]">
                {d.name}
              </span>
              <span className="num text-xs text-[color:var(--color-fg-subtle)]">
                {((d.value / total) * 100).toFixed(0)}%
              </span>
              <span className="num text-right">
                <Cash amount={d.value} />
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
