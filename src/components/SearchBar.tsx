"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

type Hit = {
  symbol: string;
  name: string;
  exchange: string;
  kind: string;
};

export function SearchBar() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open]);

  // Cmd-K / Ctrl-K opens
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (!q.trim()) {
      setHits([]);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const j = await r.json();
        setHits(j.hits ?? []);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  function go(symbol: string) {
    setOpen(false);
    setQ("");
    router.push(`/t/${encodeURIComponent(symbol.toUpperCase())}`);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search"
        className="hidden items-center gap-2 rounded-full bg-[color:var(--color-surface-2)] px-3 py-1.5 text-sm text-[color:var(--color-fg-muted)] transition hover:text-[color:var(--color-fg)] sm:flex"
      >
        <Search size={14} />
        <span>Search…</span>
        <kbd className="ml-2 rounded border border-[color:var(--color-border)] px-1.5 py-0.5 text-[10px] text-[color:var(--color-fg-subtle)]">
          ⌘K
        </kbd>
      </button>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search"
        className="rounded-full p-2 text-[color:var(--color-fg-muted)] transition hover:bg-[color:var(--color-surface-2)] hover:text-[color:var(--color-fg)] sm:hidden"
      >
        <Search size={18} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 pt-[12vh] backdrop-blur"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] shadow-2xl">
            <div className="flex items-center gap-3 border-b border-[color:var(--color-border)] px-4 py-3">
              <Search size={16} className="text-[color:var(--color-fg-muted)]" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && hits[0]) go(hits[0].symbol);
                }}
                placeholder="Search any ticker — AAPL, BTC, VOO…"
                className="flex-1 bg-transparent text-sm placeholder:text-[color:var(--color-fg-subtle)] focus:outline-none"
              />
            </div>
            <div className="max-h-96 overflow-y-auto">
              {loading && (
                <p className="px-4 py-3 text-xs text-[color:var(--color-fg-subtle)]">
                  Searching…
                </p>
              )}
              {!loading && q.trim() && hits.length === 0 && (
                <p className="px-4 py-3 text-xs text-[color:var(--color-fg-subtle)]">
                  No matches.
                </p>
              )}
              {hits.map((h) => (
                <button
                  key={`${h.symbol}-${h.exchange}`}
                  onClick={() => go(h.symbol)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-[color:var(--color-surface-2)]"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{h.symbol}</div>
                    <div className="truncate text-xs text-[color:var(--color-fg-subtle)]">
                      {h.name}
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2 text-xs text-[color:var(--color-fg-subtle)]">
                    <span>{h.exchange}</span>
                    <span className="pill text-[10px]">{h.kind}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
