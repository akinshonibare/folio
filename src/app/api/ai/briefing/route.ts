import { NextResponse } from "next/server";
import { getApiUserId } from "@/lib/auth/session";
import { aiAvailable } from "@/lib/ai/anthropic";
import { buildBriefing } from "@/lib/ai/briefing";
import {
  getLatestSnapshot,
  getPreviousSnapshot,
  getHoldings,
} from "@/lib/db/queries";
import { computeMovement } from "@/lib/portfolio/aggregate";
import { nextWindowStart } from "@/lib/ai/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const userId = await getApiUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!aiAvailable()) {
    return NextResponse.json({ available: false });
  }
  const refresh = new URL(req.url).searchParams.get("refresh") === "1";

  const snap = await getLatestSnapshot(userId);
  if (!snap) {
    return NextResponse.json({ available: true, briefing: null });
  }
  const prev = await getPreviousSnapshot(userId, snap.id);
  if (!prev) {
    return NextResponse.json({
      available: true,
      briefing: null,
      reason: "Need at least two snapshots to compute movement.",
    });
  }
  const [holdings, prevHoldings] = await Promise.all([
    getHoldings(userId, snap.id),
    getHoldings(userId, prev.id),
  ]);
  const movement = await computeMovement(holdings, prevHoldings);

  try {
    const result = await buildBriefing(movement, {
      userId,
      snapshotId: snap.id,
      refresh,
    });
    return NextResponse.json({
      available: true,
      briefing: result?.briefing ?? null,
      generatedAt: result?.generatedAt ?? null,
      cached: result?.cached ?? false,
      nextRefreshAt: nextWindowStart().toISOString(),
    });
  } catch (e) {
    return NextResponse.json({
      available: true,
      briefing: null,
      error: e instanceof Error ? e.message : "AI call failed",
    });
  }
}
