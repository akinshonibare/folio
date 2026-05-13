"use client";

import { useCallback, useEffect, useState } from "react";
import { Cloud, RefreshCw } from "lucide-react";

type ApiResp = {
  available: boolean;
  briefing?: {
    paragraph: string;
    top: { symbol: string; deltaPct: number; deltaCad: number }[];
  } | null;
  generatedAt?: string | null;
  cached?: boolean;
  reason?: string;
  error?: string;
};

export function DailyBriefing() {
  const [resp, setResp] = useState<ApiResp | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    try {
      const r = await fetch(
        refresh ? "/api/ai/briefing?refresh=1" : "/api/ai/briefing",
      );
      const j = (await r.json()) as ApiResp;
      return j;
    } catch {
      return { available: true, error: "network" } as ApiResp;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setResp(null);
    load().then((j) => !cancelled && setResp(j));
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function refresh() {
    setRefreshing(true);
    const j = await load(true);
    setResp(j);
    setRefreshing(false);
  }

  return (
    <div
      className="overflow-hidden rounded-3xl p-5"
      style={{
        background:
          "linear-gradient(135deg, #6B5BE6 0%, #4F3DCB 60%, #2D1F95 100%)",
      }}
    >
      <div className="flex items-start gap-3">
        <Cloud className="shrink-0 text-white" size={28} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-bold">Daily briefing</p>
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-white/60">
              <span>
                {resp == null
                  ? "writing…"
                  : resp.available === false
                  ? "AI not configured"
                  : resp.error
                  ? "error"
                  : resp.cached
                  ? "cached"
                  : "fresh"}
              </span>
              <button
                type="button"
                onClick={refresh}
                disabled={refreshing || resp == null || resp.available === false}
                aria-label="Refresh"
                title="Regenerate"
                className="rounded-full p-1 text-white/70 hover:text-white disabled:opacity-40"
              >
                <RefreshCw
                  size={14}
                  className={refreshing ? "animate-spin" : ""}
                />
              </button>
            </div>
          </div>
          <div className="mt-2 text-sm leading-snug text-white/90">
            {resp == null && (
              <span className="opacity-70">Reading your snapshots…</span>
            )}
            {resp && resp.available === false && (
              <span>
                Add an <code className="rounded bg-black/30 px-1">ANTHROPIC_API_KEY</code>{" "}
                to unlock AI commentary on your holdings.
              </span>
            )}
            {resp && resp.available && resp.reason && (
              <span className="opacity-80">{resp.reason}</span>
            )}
            {resp && resp.available && resp.briefing && (
              <p>{resp.briefing.paragraph}</p>
            )}
            {resp && resp.error && (
              <span className="opacity-80">AI call failed: {resp.error}</span>
            )}
          </div>
          {resp?.generatedAt && (
            <p className="mt-2 text-[10px] text-white/50">
              generated {formatRelative(resp.generatedAt)}
            </p>
          )}
          {resp?.briefing?.top && resp.briefing.top.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {resp.briefing.top.map((t) => (
                <li
                  key={t.symbol}
                  className="rounded-full bg-black/30 px-2.5 py-1 text-xs"
                >
                  <span className="font-semibold">{t.symbol}</span>{" "}
                  <span
                    style={{
                      color:
                        t.deltaPct >= 0
                          ? "var(--color-positive)"
                          : "var(--color-negative)",
                    }}
                  >
                    {t.deltaPct >= 0 ? "+" : ""}
                    {t.deltaPct.toFixed(2)}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const ms = Date.now() - then;
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "moments ago";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
