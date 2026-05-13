import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { ensureUserRowForApi } from "@/lib/auth/session";
import { db, schema } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Destructive: delete everything the user has uploaded — snapshots, positions
 * (cascade), accounts (cascade), and watchlist entries. Keeps the users row
 * and user_settings so preferences (display currency, stealth, etc) survive.
 *
 * Requires `?confirm=DELETE` to avoid drive-by deletion from a stale tab.
 */
export async function DELETE(req: Request) {
  const userId = await ensureUserRowForApi();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const confirm = new URL(req.url).searchParams.get("confirm");
  if (confirm !== "DELETE") {
    return NextResponse.json(
      { error: "Missing confirm=DELETE" },
      { status: 400 },
    );
  }

  const counts = { snapshots: 0, accounts: 0, watchlist: 0 };
  // Snapshots cascade to positions via FK on snapshot_id.
  const delSnaps = await db()
    .delete(schema.snapshots)
    .where(eq(schema.snapshots.userId, userId))
    .returning({ id: schema.snapshots.id });
  counts.snapshots = delSnaps.length;
  const delAccounts = await db()
    .delete(schema.accounts)
    .where(eq(schema.accounts.userId, userId))
    .returning({ id: schema.accounts.id });
  counts.accounts = delAccounts.length;
  const delWatch = await db()
    .delete(schema.watchlist)
    .where(eq(schema.watchlist.userId, userId))
    .returning({ id: schema.watchlist.id });
  counts.watchlist = delWatch.length;

  return NextResponse.json({ ok: true, deleted: counts });
}
