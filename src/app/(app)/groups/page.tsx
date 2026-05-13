import Link from "next/link";
import { ensureUserRow } from "@/lib/auth/session";
import { listMyGroups } from "@/lib/db/groups";
import { TopBar } from "@/components/ui/TopBar";
import { Section } from "@/components/ui/Section";
import { GroupActions } from "@/components/groups/GroupActions";
import { Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  const userId = await ensureUserRow();
  const groups = await listMyGroups(userId);
  return (
    <>
      <TopBar title="Groups" back="/home" />
      <div className="space-y-6 pt-2">
        <Section subhead="Friends & circles" title="Your groups">
          <GroupActions />
        </Section>
        {groups.length === 0 ? (
          <div className="card p-6 text-center text-sm text-[color:var(--color-fg-muted)]">
            You're not in any groups yet. Create one above, or join a friend's
            by entering their invite code.
          </div>
        ) : (
          <div className="card divide-y divide-[color:var(--color-border)] overflow-hidden">
            {groups.map((g) => (
              <Link
                key={g.id}
                href={`/groups/${g.id}`}
                className="flex items-center gap-3 px-4 py-3 transition hover:bg-[color:var(--color-surface-2)]/40"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--color-accent)]/20 text-[color:var(--color-accent)]">
                  <Users size={16} />
                </span>
                <div className="flex-1">
                  <p className="font-semibold">{g.name}</p>
                  <p className="text-xs text-[color:var(--color-fg-muted)]">
                    {g.memberCount} member{g.memberCount === 1 ? "" : "s"} ·{" "}
                    code <span className="font-mono">{g.inviteCode}</span>
                  </p>
                </div>
                {g.role === "owner" && (
                  <span className="pill text-[10px]">owner</span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
