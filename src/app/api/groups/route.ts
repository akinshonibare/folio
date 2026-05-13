import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureUserRowForApi } from "@/lib/auth/session";
import { createGroup, listMyGroups } from "@/lib/db/groups";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ name: z.string().min(1).max(60) });

export async function GET() {
  const userId = await ensureUserRowForApi();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const groups = await listMyGroups(userId);
  return NextResponse.json({ groups });
}

export async function POST(req: Request) {
  const userId = await ensureUserRowForApi();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success)
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const { id, inviteCode } = await createGroup(userId, body.data.name);
  return NextResponse.json({ id, inviteCode });
}
