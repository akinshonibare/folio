"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";

type NewsItem = {
  providerId: string;
  title: string;
  link: string;
  publisher: string | null;
  publishedAt: string;
};

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export function NewsFeed({ symbol }: { symbol: string }) {
  const [items, setItems] = useState<NewsItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/news/${encodeURIComponent(symbol)}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        setItems(j.items ?? []);
      })
      .catch(() => !cancelled && setItems([]));
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  return (
    <section className="card">
      <div className="border-b border-[color:var(--color-border)] px-5 py-3">
        <h2 className="text-sm font-medium text-[color:var(--color-fg-muted)]">
          News
        </h2>
      </div>
      <div>
        {items == null ? (
          <p className="px-5 py-5 text-sm text-[color:var(--color-fg-subtle)]">
            Loading…
          </p>
        ) : items.length === 0 ? (
          <p className="px-5 py-5 text-sm text-[color:var(--color-fg-subtle)]">
            No recent headlines for {symbol}.
          </p>
        ) : (
          <ul>
            {items.map((n) => (
              <li
                key={n.providerId}
                className="border-b border-[color:var(--color-border)]/50 last:border-b-0"
              >
                <a
                  href={n.link}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-start justify-between gap-3 px-5 py-3 transition hover:bg-[color:var(--color-surface-2)]/40"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-snug">
                      {n.title}
                    </p>
                    <p className="mt-1 text-xs text-[color:var(--color-fg-subtle)]">
                      {n.publisher ? `${n.publisher} · ` : ""}
                      {timeAgo(n.publishedAt)}
                    </p>
                  </div>
                  <ExternalLink
                    size={14}
                    className="mt-1 shrink-0 text-[color:var(--color-fg-subtle)] opacity-0 transition group-hover:opacity-100"
                  />
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
