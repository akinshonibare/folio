import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureUserRowForApi } from "@/lib/auth/session";
import { db, schema } from "@/lib/db/client";
import { eq, sql } from "drizzle-orm";
import { polygonAvailable } from "@/lib/quotes/provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  quoteProvider: z.enum(["yahoo", "polygon"]).optional(),
  displayCurrency: z.enum(["CAD", "USD"]).optional(),
  stealthDefault: z.boolean().optional(),
  shareDollarsInGroups: z.boolean().optional(),
});

export async function PATCH(req: Request) {
  const userId = await ensureUserRowForApi();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  // Hard guard: never honour a Polygon preference if the env key isn't set.
  if (body.data.quoteProvider === "polygon" && !polygonAvailable()) {
    return NextResponse.json(
      { error: "Polygon is not configured on this deployment" },
      { status: 400 },
    );
  }
  await db()
    .update(schema.userSettings)
    .set({
      ...body.data,
      updatedAt: sql`now()`,
    })
    .where(eq(schema.userSettings.userId, userId));
  return NextResponse.json({ ok: true });
}
