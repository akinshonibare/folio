"use client";

import { useEffect, useState } from "react";

type Sentiment = {
  bullPct: number | null;
  bearPct: number | null;
  mentions24h: number;
  sampleSize: number;
} | null;

/**
 * Small inline pill: "🟢 78% bull · 12 mentions/24h" or similar.
 * Returns nothing when there's no signal worth showing.
 */
export function SentimentBadge({ symbol, compact = false }: { symbol: string; compact?: boolean }) {
  const [s, setS] = useState<Sentiment>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/sentiment/${encodeURIComponent(symbol)}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        setS(j.stocktwits ?? null);
        setLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  if (!loaded) {
    return (
      <span className="text-xs text-[color:var(--color-fg-subtle)]">…</span>
    );
  }
  if (!s) {
    return (
      <span className="text-xs text-[color:var(--color-fg-subtle)]">
        no signal
      </span>
    );
  }

  const bull = s.bullPct;
  const tone =
    bull == null
      ? "muted"
      : bull >= 60
      ? "positive"
      : bull <= 40
      ? "negative"
      : "muted";

  if (compact) {
    return (
      <span
        className="num text-xs"
        style={{ color: toneColor(tone) }}
      >
        {bull != null ? `${bull.toFixed(0)}%` : "—"} · {s.mentions24h}
      </span>
    );
  }

  return (
    <div className="flex items-baseline gap-3">
      <div>
        <div className="text-xs uppercase tracking-wider text-[color:var(--color-fg-subtle)]">
          StockTwits
        </div>
        <div className="num mt-1 text-lg font-semibold" style={{ color: toneColor(tone) }}>
          {bull != null ? `${bull.toFixed(0)}% bullish` : "No tagged sentiment"}
        </div>
        <div className="num mt-0.5 text-xs text-[color:var(--color-fg-subtle)]">
          {s.mentions24h} mentions in 24h · {s.sampleSize} recent messages
        </div>
      </div>
    </div>
  );
}

function toneColor(tone: "positive" | "negative" | "muted"): string {
  if (tone === "positive") return "var(--color-positive)";
  if (tone === "negative") return "var(--color-negative)";
  return "var(--color-fg-muted)";
}
