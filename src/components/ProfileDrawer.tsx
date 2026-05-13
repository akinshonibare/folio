"use client";

import Link from "next/link";
import { useUser, useClerk } from "@clerk/nextjs";
import { X, Link2, Settings as SettingsIcon, LogOut, RefreshCw, Wallet, Upload } from "lucide-react";
import { useStealth } from "./StealthContext";
import { Cash } from "./Cash";

export function ProfileDrawer({
  open,
  onClose,
  totalWorth,
}: {
  open: boolean;
  onClose: () => void;
  totalWorth?: number;
}) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { stealth, toggle } = useStealth();

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="mx-auto h-full max-w-md overflow-y-auto bg-[color:var(--color-bg)] px-5 pt-6 pb-12">
        <div className="flex items-center justify-between">
          <div className="text-center w-full">
            <p className="text-xs text-[color:var(--color-fg-muted)]">Total Worth</p>
            <div className="mt-1 flex items-center justify-center gap-2">
              <span className="num text-2xl font-bold">
                {totalWorth != null ? (
                  <Cash amount={totalWorth} />
                ) : (
                  <span className="text-[color:var(--color-fg-subtle)]">$0.00</span>
                )}
              </span>
              <button
                onClick={toggle}
                className="rounded-full p-1 text-[color:var(--color-fg-muted)]"
                aria-label={stealth ? "Show" : "Hide"}
              >
                {stealth ? "👁" : "🙈"}
              </button>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-5 top-6 rounded-full p-2 text-[color:var(--color-fg-muted)]"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mt-8 flex flex-col items-center">
          <div className="h-16 w-16 overflow-hidden rounded-full bg-[color:var(--color-surface-2)]">
            {user?.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.imageUrl} alt="" className="h-full w-full object-cover" />
            )}
          </div>
          <h2 className="mt-3 text-xl font-bold">
            {user?.fullName ?? user?.username ?? "you"}
          </h2>
          <p className="mt-1 text-sm text-[color:var(--color-fg-muted)]">
            {user?.primaryEmailAddress?.emailAddress ?? ""}
          </p>
        </div>

        <div className="mt-8 card-row divide-y divide-[color:var(--color-border)]">
          <DrawerRow icon={<RefreshCw size={18} />} label="Auto refreshing prices">
            <Toggle on={true} />
          </DrawerRow>
        </div>

        <div className="mt-4 card-row divide-y divide-[color:var(--color-border)]">
          <DrawerLink href="/upload" icon={<Upload size={18} />} label="Upload CSV" onNavigate={onClose} />
          <DrawerLink href="/settings" icon={<SettingsIcon size={18} />} label="Settings" onNavigate={onClose} />
          <button
            type="button"
            onClick={async () => {
              await signOut({ redirectUrl: "/sign-in" });
            }}
            className="flex w-full items-center gap-3 px-4 py-4 text-left text-[15px] font-medium text-[color:var(--color-fg)]"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>

        <p className="mt-10 text-center text-xs text-[color:var(--color-fg-subtle)]">
          folio · beta
        </p>
      </div>
    </div>
  );
}

function DrawerRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-4 text-[15px] font-medium">
      <span className="text-[color:var(--color-fg-muted)]">{icon}</span>
      <span className="flex-1">{label}</span>
      {children}
    </div>
  );
}

function DrawerLink({
  href,
  icon,
  label,
  onNavigate,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="flex items-center gap-3 px-4 py-4 text-[15px] font-medium"
    >
      <span className="text-[color:var(--color-fg-muted)]">{icon}</span>
      <span className="flex-1">{label}</span>
    </Link>
  );
}

function Toggle({ on }: { on: boolean }) {
  return (
    <span
      className={`relative inline-block h-6 w-11 rounded-full transition ${
        on ? "bg-white" : "bg-[color:var(--color-surface-3)]"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-[color:var(--color-surface-3)] transition ${
          on ? "left-[1.4rem]" : "left-0.5"
        }`}
      />
    </span>
  );
}
