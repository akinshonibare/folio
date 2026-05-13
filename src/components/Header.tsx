"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Eye, EyeOff, Upload, Settings as SettingsIcon, Star } from "lucide-react";
import { useStealth } from "./StealthContext";
import { SearchBar } from "./SearchBar";

export function Header() {
  const { stealth, toggle } = useStealth();
  return (
    <header className="sticky top-0 z-10 border-b border-[color:var(--color-border)] bg-[color:var(--color-bg)]/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/dashboard" className="flex items-baseline gap-2">
          <span className="text-lg font-semibold tracking-tight">folio</span>
          <span className="text-xs text-[color:var(--color-fg-subtle)]">
            beta
          </span>
        </Link>
        <nav className="flex items-center gap-2">
          <SearchBar />
          <Link
            href="/watchlist"
            aria-label="Watchlist"
            className="rounded-full p-2 text-[color:var(--color-fg-muted)] transition hover:bg-[color:var(--color-surface-2)] hover:text-[color:var(--color-fg)]"
            title="Watchlist"
          >
            <Star size={18} />
          </Link>
          <button
            type="button"
            onClick={toggle}
            aria-label={stealth ? "Show amounts" : "Hide amounts"}
            className="rounded-full p-2 text-[color:var(--color-fg-muted)] transition hover:bg-[color:var(--color-surface-2)] hover:text-[color:var(--color-fg)]"
            title={stealth ? "Show amounts" : "Hide amounts (stealth mode)"}
          >
            {stealth ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
          <Link
            href="/upload"
            className="flex items-center gap-1.5 rounded-full bg-[color:var(--color-surface-2)] px-3 py-1.5 text-sm text-[color:var(--color-fg-muted)] transition hover:text-[color:var(--color-fg)]"
          >
            <Upload size={14} />
            <span className="hidden sm:inline">Upload</span>
          </Link>
          <Link
            href="/settings"
            aria-label="Settings"
            className="hidden rounded-full p-2 text-[color:var(--color-fg-muted)] transition hover:bg-[color:var(--color-surface-2)] hover:text-[color:var(--color-fg)] sm:flex"
          >
            <SettingsIcon size={18} />
          </Link>
          <div className="ml-1">
            <UserButton
              appearance={{
                elements: { userButtonAvatarBox: "h-8 w-8" },
              }}
            />
          </div>
        </nav>
      </div>
    </header>
  );
}
