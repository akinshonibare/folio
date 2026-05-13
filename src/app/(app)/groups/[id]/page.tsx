import { notFound } from "next/navigation";
import Link from "next/link";
import { ensureUserRow } from "@/lib/auth/session";
import { getGroupView } from "@/lib/db/groups";
import { TopBar } from "@/components/ui/TopBar";
import { Section } from "@/components/ui/Section";
import { TickerIcon } from "@/components/ui/TickerIcon";
import { Cash } from "@/components/Cash";
import { GroupHeader } from "@/components/groups/GroupHeader";
import { formatQuantity } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const gid = parseInt(id, 10);
  if (!Number.isFinite(gid)) notFound();
  const userId = await ensureUserRow();
  const data = await getGroupView(userId, gid);
  if (!data) notFound();

  // Cross-member ticker leaderboard: which tickers do the most members hold?
  const tickerCount = new Map<
    string,
    { count: number; holders: Set<string>; name: string | null }
  >();
  for (const m of data.members) {
    const seen = new Set<string>();
    for (const h of m.holdings) {
      if (seen.has(h.symbol)) continue;
      seen.add(h.symbol);
      const entry = tickerCount.get(h.symbol) ?? {
        count: 0,
        holders: new Set<string>(),
        name: h.name,
      };
      entry.count += 1;
      entry.holders.add(m.userId);
      if (!entry.name) entry.name = h.name;
      tickerCount.set(h.symbol, entry);
    }
  }
  const top = Array.from(tickerCount.entries())
    .filter(([, v]) => v.count >= 2)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 8)
    .map(([symbol, v]) => ({
      symbol,
      name: v.name,
      count: v.count,
    }));

  return (
    <>
      <TopBar title={data.group.name} back="/groups" />
      <div className="space-y-6 pt-2">
        <GroupHeader
          groupId={data.group.id}
          name={data.group.name}
          inviteCode={data.group.inviteCode}
          memberCount={data.members.length}
        />

        {top.length > 0 && (
          <Section subhead="Crowd favourites" title="Most-held tickers">
            <div className="card divide-y divide-[color:var(--color-border)] overflow-hidden">
              {top.map((t) => (
                <Link
                  key={t.symbol}
                  href={`/t/${encodeURIComponent(t.symbol)}`}
                  className="flex items-center gap-3 px-4 py-3 transition hover:bg-[color:var(--color-surface-2)]/50"
                >
                  <TickerIcon symbol={t.symbol} size={32} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{t.symbol}</p>
                    {t.name && (
                      <p className="truncate text-xs text-[color:var(--color-fg-muted)]">
                        {t.name}
                      </p>
                    )}
                  </div>
                  <span className="pill text-xs">
                    {t.count} member{t.count === 1 ? "" : "s"}
                  </span>
                </Link>
              ))}
            </div>
          </Section>
        )}

        <Section subhead="Around the room" title="Members">
          <div className="space-y-3">
            {data.members.map((m) => (
              <article key={m.userId} className="card p-4">
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="font-semibold">
                      {m.displayName ?? m.email ?? m.userId}
                      {m.userId === userId && (
                        <span className="ml-2 text-xs text-[color:var(--color-fg-subtle)]">
                          (you)
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-[color:var(--color-fg-muted)]">
                      {m.holdings.length} position
                      {m.holdings.length === 1 ? "" : "s"} ·{" "}
                      {m.shareDollarsInGroups || m.userId === userId
                        ? "$ visible"
                        : "$ hidden"}
                    </p>
                  </div>
                  {m.totalCad != null && (
                    <p className="num text-lg font-bold">
                      <Cash amount={m.totalCad} />
                    </p>
                  )}
                </div>
                {m.holdings.length === 0 ? (
                  <p className="mt-3 text-xs text-[color:var(--color-fg-subtle)]">
                    No uploads yet.
                  </p>
                ) : (
                  <ul className="mt-3 divide-y divide-[color:var(--color-border)]">
                    {m.holdings.slice(0, 8).map((h, i) => (
                      <li
                        key={`${h.symbol}-${i}`}
                        className="flex items-center gap-3 py-2"
                      >
                        <TickerIcon symbol={h.symbol} size={26} />
                        <Link
                          href={`/t/${encodeURIComponent(h.symbol)}`}
                          className="flex-1 min-w-0"
                        >
                          <p className="text-sm font-semibold">{h.symbol}</p>
                          {h.name && (
                            <p className="truncate text-[11px] text-[color:var(--color-fg-muted)]">
                              {h.name}
                            </p>
                          )}
                        </Link>
                        <div className="text-right">
                          <p className="num text-xs text-[color:var(--color-fg-muted)]">
                            {formatQuantity(h.quantity)} shares
                          </p>
                          <p className="num text-xs">
                            {h.valueCad != null ? (
                              <Cash amount={h.valueCad} />
                            ) : (
                              <span className="text-[color:var(--color-fg-subtle)]">
                                • • •
                              </span>
                            )}
                          </p>
                        </div>
                      </li>
                    ))}
                    {m.holdings.length > 8 && (
                      <li className="pt-2 text-center text-xs text-[color:var(--color-fg-subtle)]">
                        +{m.holdings.length - 8} more
                      </li>
                    )}
                  </ul>
                )}
              </article>
            ))}
          </div>
        </Section>
      </div>
    </>
  );
}
