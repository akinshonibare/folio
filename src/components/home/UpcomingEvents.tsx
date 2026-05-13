import Link from "next/link";
import { TickerIcon } from "@/components/ui/TickerIcon";
import { CalendarPlus } from "lucide-react";
import type { EarningsEvent } from "@/lib/markets/earnings";

const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function bucket(iso: string): { header: string; tone: string } {
  const d = new Date(iso + "T16:00:00Z");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor(
    (d.getTime() - today.getTime()) / 86_400_000,
  );
  if (diff === 0) return { header: "Today", tone: "today" };
  if (diff === 1) return { header: "Tomorrow", tone: "near" };
  const day = d.getUTCDate();
  const month = MON[d.getUTCMonth()].slice(0, 3);
  const weekday = DAY[d.getUTCDay()];
  return { header: `${day} ${month} ${weekday}`, tone: "future" };
}

const KIND_STYLE: Record<EarningsEvent["kind"], string> = {
  EARNINGS:
    "border border-[color:var(--color-earnings)]/40 text-[color:var(--color-earnings)]",
  DIVIDEND:
    "border border-[color:var(--color-dividend)]/40 text-[color:var(--color-dividend)]",
};

export function UpcomingEvents({ events }: { events: EarningsEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="card p-5 text-sm text-[color:var(--color-fg-subtle)]">
        No upcoming earnings or dividend dates within the next 45 days for the
        tickers you hold or watch.
      </div>
    );
  }
  // Group by date header
  const groups: { header: string; items: EarningsEvent[] }[] = [];
  for (const e of events) {
    const { header } = bucket(e.date);
    let g = groups.find((x) => x.header === header);
    if (!g) {
      g = { header, items: [] };
      groups.push(g);
    }
    g.items.push(e);
  }
  return (
    <div className="card divide-y divide-[color:var(--color-border)] overflow-hidden">
      {groups.map((g) => (
        <div key={g.header}>
          <p className="bg-[color:var(--color-surface-2)]/40 px-4 py-2 text-sm font-semibold text-[color:var(--color-fg-muted)]">
            {g.header}
          </p>
          <ul>
            {g.items.map((e) => (
              <li key={`${e.symbol}-${e.kind}-${e.date}`}>
                <Link
                  href={`/t/${encodeURIComponent(e.symbol)}`}
                  className="flex items-center gap-3 px-4 py-3 transition hover:bg-[color:var(--color-surface-2)]/40"
                >
                  <TickerIcon symbol={e.symbol} size={34} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold leading-tight">{e.symbol}</p>
                    {e.name && (
                      <p className="truncate text-xs text-[color:var(--color-fg-muted)]">
                        {e.name}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`pill text-[10px] font-semibold ${KIND_STYLE[e.kind]}`}
                      style={{ background: "transparent" }}
                    >
                      {e.kind}
                    </span>
                    <CalendarPlus
                      size={16}
                      className="text-[color:var(--color-fg-subtle)]"
                    />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
