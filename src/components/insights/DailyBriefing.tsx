"use client";

import { useEffect, useState } from "react";
import { Cloud, RefreshCw } from "lucide-react";

type ApiResp = {
  available: boolean;
  briefing?: {
    paragraph: string;
    top: { symbol: string; deltaPct: number; deltaCad: number }[];
  } | null;
  reason?: string;
  error?: string;
};

export function DailyBriefing() {
  const [resp, setResp] = useState<ApiResp | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setResp(null);
    fetch("/api/ai/briefing")
      .then((r) => r.json())
      .then((j) => !cancelled && setResp(j))
      .catch(() => !cancelled && setResp({ available: true, error: "network" }));
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

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
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              aria-label="Refresh"
              className="rounded-full p-1 text-white/70 hover:text-white"
              title="Regenerate"
            >
              <RefreshCw size={14} />
            </button>
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
