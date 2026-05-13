"use client";

import { useCallback, useEffect, useState } from "react";
import { TickerIcon } from "@/components/ui/TickerIcon";
import { ExternalLink, RefreshCw } from "lucide-react";

type Citation = { title: string; link: string; publisher: string | null };

type ApiResp = {
  available: boolean;
  commentary?: { paragraph: string; citations: Citation[] } | null;
  generatedAt?: string | null;
  cached?: boolean;
  error?: string;
};

/**
 * Pulls AI-generated commentary for a symbol. Server-side cache aligned to
 * three daily windows (08:00 / 13:00 / 20:00) keeps cost low — manual refresh
 * button forces a fresh Claude call.
 */
export function WhyIsItMoving({
  symbol,
  name,
  price,
  changePct,
  exchange,
  securityType,
}: {
  symbol: string;
  name: string | null;
  price: number | null;
  changePct: number | null;
  exchange?: string | null;
  securityType?: string | null;
}) {
  const [resp, setResp] = useState<ApiResp | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchIt = useCallback(
    async (refresh = false) => {
      const qs = new URLSearchParams();
      if (name) qs.set("name", name);
      if (changePct != null) qs.set("changePct", String(changePct));
      if (exchange) qs.set("exchange", exchange);
      if (securityType) qs.set("securityType", securityType);
      if (refresh) qs.set("refresh", "1");
      try {
        const r = await fetch(
          `/api/ai/explain/${encodeURIComponent(symbol)}?${qs}`,
        );
        const j = (await r.json()) as ApiResp;
        return j;
      } catch {
        return {
          available: true,
          error: "network error",
          commentary: null,
        } as ApiResp;
      }
    },
    [symbol, name, changePct, exchange, securityType],
  );

  useEffect(() => {
    let cancelled = false;
    setResp(null);
    fetchIt().then((j) => {
      if (!cancelled) setResp(j);
    });
    return () => {
      cancelled = true;
    };
  }, [fetchIt]);

  async function refresh() {
    setRefreshing(true);
    const j = await fetchIt(true);
    setResp(j);
    setRefreshing(false);
  }

  const loading = resp == null;
  const unavailable = resp && resp.available === false;
  const errored = resp && resp.error;
  const c = resp?.commentary ?? null;

  return (
    <div
      className="relative overflow-hidden rounded-3xl p-5"
      style={{
        background:
          "linear-gradient(135deg, #6B3A12 0%, #5C2F0F 60%, #3A1F0B 100%)",
      }}
    >
      <div className="flex items-start gap-3">
        <TickerIcon symbol={symbol} size={36} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-3">
            <div className="min-w-0">
              <p className="font-bold">{symbol}</p>
              {name && (
                <p className="truncate text-xs text-white/70">{name}</p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-[11px] uppercase tracking-wider text-white/60">
                {loading
                  ? "writing…"
                  : unavailable
                  ? "AI not configured"
                  : errored
                  ? "AI error"
                  : resp?.cached
                  ? "cached"
                  : "fresh"}
              </span>
              <button
                type="button"
                onClick={refresh}
                disabled={refreshing || loading || !!unavailable}
                aria-label="Refresh"
                title="Regenerate"
                className="rounded-full p-1 text-white/70 hover:text-white disabled:opacity-40"
              >
                <RefreshCw
                  size={13}
                  className={refreshing ? "animate-spin" : ""}
                />
              </button>
            </div>
          </div>

          <div className="mt-3 text-sm leading-snug text-white/90">
            {loading && (
              <span className="opacity-70">
                Synthesising news + crowd sentiment…
              </span>
            )}
            {unavailable && (
              <span>
                Set{" "}
                <code className="rounded bg-black/40 px-1 text-xs">
                  ANTHROPIC_API_KEY
                </code>{" "}
                in your environment to enable per-position commentary.
              </span>
            )}
            {errored && <span className="opacity-80">{resp?.error}</span>}
            {c && c.paragraph && <p>{c.paragraph}</p>}
          </div>

          {resp?.generatedAt && (
            <p className="mt-2 text-[10px] text-white/50">
              generated {formatRelative(resp.generatedAt)}
            </p>
          )}

          {price != null && (
            <div className="mt-3 flex items-baseline gap-3 text-sm">
              <span className="num rounded bg-black/40 px-2 py-1 font-semibold">
                ${price.toFixed(2)}
              </span>
              {changePct != null && (
                <span
                  className="num font-semibold"
                  style={{
                    color:
                      changePct >= 0
                        ? "var(--color-positive)"
                        : "var(--color-negative)",
                  }}
                >
                  {changePct >= 0 ? "▲ +" : "▼ "}
                  {changePct.toFixed(2)}%
                </span>
              )}
            </div>
          )}

          {c && c.citations.length > 0 && (
            <ul className="mt-3 space-y-1">
              {c.citations.map((cite, i) => (
                <li key={i}>
                  <a
                    href={cite.link}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-[12px] text-white/70 underline-offset-2 hover:underline"
                  >
                    <ExternalLink size={11} />
                    <span className="truncate">
                      {cite.title}
                      {cite.publisher ? ` — ${cite.publisher}` : ""}
                    </span>
                  </a>
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
