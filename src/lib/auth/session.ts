import { auth, currentUser } from "@clerk/nextjs/server";
import { db, schema } from "@/lib/db/client";
import { eq } from "drizzle-orm";

/**
 * Resolve the current user id (Clerk subject). Throws if not signed in.
 * Callers in protected routes can use this directly; middleware already
 * gates anonymous traffic.
 */
export async function requireUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Not signed in");
  }
  return userId;
}

/**
 * Lazy-ensure the user has a row in our `users` table. Clerk owns identity;
 * we mirror just enough to FK other tables.
 */
export async function ensureUserRow(): Promise<string> {
  const userId = await requireUserId();
  const user = await currentUser();
  await db()
    .insert(schema.users)
    .values({
      id: userId,
      email: user?.primaryEmailAddress?.emailAddress ?? null,
      displayName:
        user?.fullName ?? user?.username ?? user?.firstName ?? null,
    })
    .onConflictDoUpdate({
      target: schema.users.id,
      set: {
        email: user?.primaryEmailAddress?.emailAddress ?? null,
        displayName:
          user?.fullName ?? user?.username ?? user?.firstName ?? null,
      },
    });

  // Make sure settings row exists.
  await db()
    .insert(schema.userSettings)
    .values({ userId })
    .onConflictDoNothing();

  return userId;
}

export async function getUserSettings(userId: string) {
  const rows = await db()
    .select()
    .from(schema.userSettings)
    .where(eq(schema.userSettings.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}
