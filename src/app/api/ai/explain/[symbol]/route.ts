import { NextResponse } from "next/server";
import { getApiUserId } from "@/lib/auth/session";
import { explainMovement } from "@/lib/ai/commentary";
import { aiAvailable } from "@/lib/ai/anthropic";

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
  const changePct = changePctRaw != null ? parseFloat(changePctRaw) : null;

  try {
    const commentary = await explainMovement({
      symbol: symbol.toUpperCase(),
      name,
      changePct,
      exchange,
      securityType,
    });
    return NextResponse.json({ available: true, commentary });
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
