import { NextResponse } from "next/server";
import { ensureUserRowForApi } from "@/lib/auth/session";
import { leaveGroup } from "@/lib/db/groups";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await ensureUserRowForApi();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const gid = parseInt(id, 10);
  if (!Number.isFinite(gid))
    return NextResponse.json({ error: "Bad id" }, { status: 400 });
  await leaveGroup(userId, gid);
  return NextResponse.json({ ok: true });
}
