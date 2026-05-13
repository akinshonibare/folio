import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureUserRowForApi } from "@/lib/auth/session";
import { joinGroupByCode } from "@/lib/db/groups";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ code: z.string().min(4).max(12) });

export async function POST(req: Request) {
  const userId = await ensureUserRowForApi();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success)
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  try {
    const { id } = await joinGroupByCode(userId, body.data.code);
    return NextResponse.json({ id });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Join failed" },
      { status: 404 },
    );
  }
}
