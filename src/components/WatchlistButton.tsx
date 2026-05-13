"use client";

import { useState } from "react";
import { Star, StarOff } from "lucide-react";
import { useRouter } from "next/navigation";

export function WatchlistButton({
  initialOn,
  instrumentId,
  symbol,
  exchange,
  name,
  kind,
}: {
  initialOn: boolean;
  instrumentId: number | null;
  symbol: string;
  exchange: string;
  name: string | null;
  kind: "EQUITY" | "EXCHANGE_TRADED_FUND" | "CRYPTOCURRENCY" | "OTHER";
}) {
  const [on, setOn] = useState(initialOn);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function toggle() {
    setPending(true);
    try {
      if (on && instrumentId) {
        await fetch("/api/watchlist", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ instrumentId }),
        });
        setOn(false);
      } else {
        await fetch("/api/watchlist", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ symbol, exchange, name, kind }),
        });
        setOn(true);
      }
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className={`flex items-center gap-2 rounded-full border border-[color:var(--color-border)] px-3 py-1.5 text-sm transition ${
        on
          ? "bg-[color:var(--color-surface-2)] text-[color:var(--color-warning)]"
          : "text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)]"
      }`}
    >
      {on ? <Star size={14} fill="currentColor" /> : <StarOff size={14} />}
      <span>{on ? "Watching" : "Watch"}</span>
    </button>
  );
}
