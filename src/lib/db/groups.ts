import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { getLatestSnapshot, getHoldings, type HoldingRow } from "@/lib/db/queries";
import { getFxRate } from "@/lib/fx/rates";

export type GroupSummary = {
  id: number;
  name: string;
  inviteCode: string;
  createdBy: string;
  memberCount: number;
  role: "owner" | "member";
};

function newInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
  let s = "";
  for (let i = 0; i < 6; i++) {
    s += chars[Math.floor(Math.random() * chars.length)];
  }
  return s;
}

export async function listMyGroups(userId: string): Promise<GroupSummary[]> {
  const rows = await db()
    .select({
      id: schema.groups.id,
      name: schema.groups.name,
      inviteCode: schema.groups.inviteCode,
      createdBy: schema.groups.createdBy,
      role: schema.groupMembers.role,
    })
    .from(schema.groupMembers)
    .innerJoin(
      schema.groups,
      eq(schema.groupMembers.groupId, schema.groups.id),
    )
    .where(eq(schema.groupMembers.userId, userId));
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const counts = await db()
    .select({
      groupId: schema.groupMembers.groupId,
      n: sql<number>`count(*)::int`,
    })
    .from(schema.groupMembers)
    .where(inArray(schema.groupMembers.groupId, ids))
    .groupBy(schema.groupMembers.groupId);
  const countMap = new Map(counts.map((c) => [c.groupId, c.n]));
  return rows.map((r) => ({
    ...r,
    role: (r.role === "owner" ? "owner" : "member") as "owner" | "member",
    memberCount: countMap.get(r.id) ?? 1,
  }));
}

export async function createGroup(
  userId: string,
  name: string,
): Promise<{ id: number; inviteCode: string }> {
  // Retry if invite code collides (extremely unlikely with 32^6 ≈ 1B codes).
  for (let attempt = 0; attempt < 5; attempt++) {
    const inviteCode = newInviteCode();
    try {
      const [row] = await db()
        .insert(schema.groups)
        .values({ name, inviteCode, createdBy: userId })
        .returning({ id: schema.groups.id });
      await db()
        .insert(schema.groupMembers)
        .values({ groupId: row.id, userId, role: "owner" });
      return { id: row.id, inviteCode };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (!msg.includes("invite_code")) throw e;
    }
  }
  throw new Error("Could not generate a unique invite code; try again.");
}

export async function joinGroupByCode(
  userId: string,
  code: string,
): Promise<{ id: number }> {
  const rows = await db()
    .select()
    .from(schema.groups)
    .where(eq(schema.groups.inviteCode, code.toUpperCase()))
    .limit(1);
  if (rows.length === 0) {
    throw new Error("Invite code not found.");
  }
  const group = rows[0];
  await db()
    .insert(schema.groupMembers)
    .values({ groupId: group.id, userId, role: "member" })
    .onConflictDoNothing();
  return { id: group.id };
}

export async function leaveGroup(
  userId: string,
  groupId: number,
): Promise<void> {
  await db()
    .delete(schema.groupMembers)
    .where(
      and(
        eq(schema.groupMembers.groupId, groupId),
        eq(schema.groupMembers.userId, userId),
      ),
    );
}

export type GroupMemberSnapshot = {
  userId: string;
  displayName: string | null;
  email: string | null;
  role: string;
  shareDollarsInGroups: boolean;
  totalCad: number | null; // null if member hasn't uploaded or opted out
  holdings: Array<{
    symbol: string;
    name: string | null;
    securityType: string;
    quantity: string;
    classification: string;
    valueCad: number | null; // null if dollars are hidden
  }>;
};

/**
 * Group-view payload: for every member, return their holdings with dollar
 * amounts replaced by null when their `shareDollarsInGroups` is off.
 * Quantities + tickers are always shared; only $ amounts are gated.
 */
export async function getGroupView(
  userId: string,
  groupId: number,
): Promise<{
  group: { id: number; name: string; inviteCode: string; createdBy: string };
  members: GroupMemberSnapshot[];
  isMember: boolean;
} | null> {
  // Caller must be a member.
  const mine = await db()
    .select()
    .from(schema.groupMembers)
    .where(
      and(
        eq(schema.groupMembers.groupId, groupId),
        eq(schema.groupMembers.userId, userId),
      ),
    )
    .limit(1);
  if (mine.length === 0) return null;

  const groupRows = await db()
    .select()
    .from(schema.groups)
    .where(eq(schema.groups.id, groupId))
    .limit(1);
  if (groupRows.length === 0) return null;
  const group = groupRows[0];

  const memberRows = await db()
    .select({
      userId: schema.groupMembers.userId,
      role: schema.groupMembers.role,
      displayName: schema.users.displayName,
      email: schema.users.email,
      shareDollarsInGroups: schema.userSettings.shareDollarsInGroups,
    })
    .from(schema.groupMembers)
    .innerJoin(
      schema.users,
      eq(schema.users.id, schema.groupMembers.userId),
    )
    .leftJoin(
      schema.userSettings,
      eq(schema.userSettings.userId, schema.groupMembers.userId),
    )
    .where(eq(schema.groupMembers.groupId, groupId));

  // Build per-member holdings. FX cache is shared across members.
  const fxCache = new Map<string, number>();
  async function fx(ccy: string): Promise<number> {
    if (fxCache.has(ccy)) return fxCache.get(ccy)!;
    try {
      const r = await getFxRate(ccy, "CAD");
      fxCache.set(ccy, r);
      return r;
    } catch {
      const fallback = ccy === "CAD" ? 1 : NaN;
      fxCache.set(ccy, fallback);
      return fallback;
    }
  }

  const members: GroupMemberSnapshot[] = await Promise.all(
    memberRows.map(async (m) => {
      const reveal = m.userId === userId || !!m.shareDollarsInGroups;
      const snap = await getLatestSnapshot(m.userId);
      if (!snap) {
        return {
          userId: m.userId,
          displayName: m.displayName,
          email: m.email,
          role: m.role,
          shareDollarsInGroups: !!m.shareDollarsInGroups,
          totalCad: null,
          holdings: [],
        };
      }
      const rows = await getHoldings(m.userId, snap.id);
      const equityRows = rows.filter((r) => r.securityType !== "OPTION");
      let total = 0;
      const enriched = await Promise.all(
        equityRows.map(async (r: HoldingRow) => {
          const rate = await fx(r.marketValueNativeCurrency);
          const value = Number.isFinite(rate)
            ? parseFloat(r.marketValueNative) * rate
            : 0;
          total += value;
          return {
            symbol: r.symbol,
            name: r.name,
            securityType: r.securityType,
            quantity: r.quantity,
            classification: r.accountClassification,
            valueCad: reveal ? value : null,
          };
        }),
      );
      enriched.sort((a, b) =>
        (b.valueCad ?? 0) > (a.valueCad ?? 0) ? 1 : -1,
      );
      return {
        userId: m.userId,
        displayName: m.displayName,
        email: m.email,
        role: m.role,
        shareDollarsInGroups: !!m.shareDollarsInGroups,
        totalCad: reveal ? total : null,
        holdings: enriched,
      };
    }),
  );

  return {
    group: {
      id: group.id,
      name: group.name,
      inviteCode: group.inviteCode,
      createdBy: group.createdBy,
    },
    members,
    isMember: true,
  };
}
