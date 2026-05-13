import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";

/**
 * Three daily refresh windows: 08:00, 13:00, 20:00 local time.
 * A cached AI entry is "fresh" if its generatedAt is >= the start of the
 * current window. This means a single Claude call powers the morning,
 * afternoon and evening visits per user — no cron needed.
 */
export function currentWindowStart(now = new Date()): Date {
  const d = new Date(now);
  d.setMinutes(0, 0, 0);
  const h = now.getHours();
  if (h >= 20) {
    d.setHours(20);
  } else if (h >= 13) {
    d.setHours(13);
  } else if (h >= 8) {
    d.setHours(8);
  } else {
    // Before 08:00 — bucket is yesterday's evening window.
    d.setDate(d.getDate() - 1);
    d.setHours(20);
  }
  return d;
}

export function nextWindowStart(now = new Date()): Date {
  const d = new Date(now);
  d.setMinutes(0, 0, 0);
  const h = now.getHours();
  if (h < 8) {
    d.setHours(8);
  } else if (h < 13) {
    d.setHours(13);
  } else if (h < 20) {
    d.setHours(20);
  } else {
    d.setDate(d.getDate() + 1);
    d.setHours(8);
  }
  return d;
}

export type AiKind = "explain" | "briefing";

export async function getCachedAi<T>(
  kind: AiKind,
  key: string,
): Promise<{ payload: T; generatedAt: Date } | null> {
  const rows = await db()
    .select({
      payload: schema.aiCache.payload,
      generatedAt: schema.aiCache.generatedAt,
    })
    .from(schema.aiCache)
    .where(and(eq(schema.aiCache.kind, kind), eq(schema.aiCache.key, key)))
    .limit(1);
  if (rows.length === 0) return null;
  return {
    payload: rows[0].payload as T,
    generatedAt: rows[0].generatedAt,
  };
}

export function isStillFresh(generatedAt: Date, now = new Date()): boolean {
  return generatedAt >= currentWindowStart(now);
}

export async function setCachedAi<T>(
  kind: AiKind,
  key: string,
  payload: T,
): Promise<void> {
  await db()
    .insert(schema.aiCache)
    .values({ kind, key, payload: payload as unknown as object })
    .onConflictDoUpdate({
      target: [schema.aiCache.kind, schema.aiCache.key],
      set: {
        payload: payload as unknown as object,
        generatedAt: new Date(),
      },
    });
}
