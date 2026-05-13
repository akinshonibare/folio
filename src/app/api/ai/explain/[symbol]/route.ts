import { NextResponse } from "next/server";
import { getApiUserId } from "@/lib/auth/session";
import { explainMovement } from "@/lib/ai/commentary";
import { aiAvailable } from "@/lib/ai/anthropic";
import { nextWindowStart } from "@/lib/ai/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const userId = await getApiUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!aiAvailable()) {
    return NextResponse.json({ available: false });
  }
  const { symbol } = await params;
  const url = new URL(req.url);
  const name = url.searchParams.get("name");
  const changePctRaw = url.searchParams.get("changePct");
  const exchange = url.searchParams.get("exchange");
  const securityType = url.searchParams.get("securityType");
  const refresh = url.searchParams.get("refresh") === "1";
  const changePct = changePctRaw != null ? parseFloat(changePctRaw) : null;

  try {
    const result = await explainMovement({
      symbol: symbol.toUpperCase(),
      name,
      changePct,
      exchange,
      securityType,
      refresh,
    });
    return NextResponse.json({
      available: true,
      commentary: result?.commentary ?? null,
      generatedAt: result?.generatedAt ?? null,
      cached: result?.cached ?? false,
      nextRefreshAt: nextWindowStart().toISOString(),
    });
  } catch (e) {
    return NextResponse.json(
      {
        available: true,
        error: e instanceof Error ? e.message : "AI call failed",
        commentary: null,
      },
      { status: 200 },
    );
  }
}
