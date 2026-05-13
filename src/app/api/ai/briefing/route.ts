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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getApiUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!aiAvailable()) {
    return NextResponse.json({ available: false });
  }

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
    const briefing = await buildBriefing(movement);
    return NextResponse.json({ available: true, briefing });
  } catch (e) {
    return NextResponse.json({
      available: true,
      briefing: null,
      error: e instanceof Error ? e.message : "AI call failed",
    });
  }
}
