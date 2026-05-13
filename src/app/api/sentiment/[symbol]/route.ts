import { NextResponse } from "next/server";
import { getApiUserId } from "@/lib/auth/session";
import { fetchStockTwitsSentiment } from "@/lib/sentiment/stocktwits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const userId = await getApiUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { symbol } = await params;
  const data = await fetchStockTwitsSentiment(symbol);
  return NextResponse.json({ stocktwits: data });
}
