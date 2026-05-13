"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, Search as SearchIcon, ArrowLeft } from "lucide-react";
import { SearchBar } from "@/components/SearchBar";
import { ProfileDrawer } from "@/components/ProfileDrawer";

export function TopBar({
  title,
  back,
}: {
  title: string;
  back?: string;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  return (
    <>
      <header className="sticky top-0 z-20 bg-[color:var(--color-bg)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          {back ? (
            <Link
              href={back}
              aria-label="Back"
              className="rounded-full p-2 text-[color:var(--color-fg-muted)] transition hover:text-[color:var(--color-fg)]"
            >
              <ArrowLeft size={20} />
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Menu"
              className="rounded-full p-2 text-[color:var(--color-fg-muted)] transition hover:text-[color:var(--color-fg)]"
            >
              <Menu size={20} />
            </button>
          )}
          <h1 className="text-base font-semibold tracking-tight">{title}</h1>
          <div className="flex items-center gap-1">
            <SearchBar />
          </div>
        </div>
      </header>
      <ProfileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
