"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Copy, Check, LogOut } from "lucide-react";

export function GroupHeader({
  groupId,
  name,
  inviteCode,
  memberCount,
}: {
  groupId: number;
  name: string;
  inviteCode: string;
  memberCount: number;
}) {
  const [copied, setCopied] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const router = useRouter();

  async function copy() {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  async function leave() {
    if (!confirm("Leave this group?")) return;
    setLeaving(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/leave`, {
        method: "POST",
      });
      if (res.ok) {
        router.push("/groups");
        router.refresh();
      }
    } finally {
      setLeaving(false);
    }
  }

  return (
    <div className="card p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--color-accent)]/20 text-[color:var(--color-accent)]">
          <Users size={20} />
        </span>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{name}</h1>
          <p className="text-sm text-[color:var(--color-fg-muted)]">
            {memberCount} member{memberCount === 1 ? "" : "s"}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={copy}
              className="flex items-center gap-2 rounded-full bg-[color:var(--color-surface-2)] px-3 py-1.5 text-xs font-mono tracking-widest hover:bg-[color:var(--color-surface-3)]"
              title="Copy invite code"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {inviteCode}
            </button>
            <button
              type="button"
              onClick={leave}
              disabled={leaving}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-[color:var(--color-negative)] hover:bg-[color:var(--color-negative-soft)]"
            >
              <LogOut size={12} />
              Leave
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
