import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db, schema } from "@/lib/db/client";
import { eq } from "drizzle-orm";

/**
 * Server-component flavour: resolve the current user id, or redirect to
 * /sign-in. Per Clerk's Next.js App Router pattern the proxy does NOT
 * protect routes — pages own their own auth checks.
 */
export async function requireUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  return userId;
}

/**
 * Route-handler flavour: returns the user id or null. Callers respond 401
 * themselves.
 */
export async function getApiUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId ?? null;
}

/**
 * Mirror Clerk's user into our `users` table (and create a settings row).
 * Pure DB operation — does no auth checks, takes the userId from a caller
 * that already authenticated.
 */
async function mirrorUser(userId: string): Promise<void> {
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
  await db()
    .insert(schema.userSettings)
    .values({ userId })
    .onConflictDoNothing();
}

/**
 * Server-component flavour: require auth + lazily ensure the user is
 * mirrored in our DB. Redirects to /sign-in if unsigned.
 */
export async function ensureUserRow(): Promise<string> {
  const userId = await requireUserId();
  await mirrorUser(userId);
  return userId;
}

/**
 * Route-handler flavour: returns null when unsigned so callers can respond
 * 401. Mirrors the user if signed in.
 */
export async function ensureUserRowForApi(): Promise<string | null> {
  const userId = await getApiUserId();
  if (!userId) return null;
  await mirrorUser(userId);
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
