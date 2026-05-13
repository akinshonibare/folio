import { NextResponse } from "next/server";
import { getApiUserId } from "@/lib/auth/session";
import { fetchHistory, type Range } from "@/lib/charts/history";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID: Range[] = ["1W", "1M", "3M", "1Y", "ALL"];

export async function GET(
  req: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const userId = await getApiUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { symbol } = await params;
  const rawRange = new URL(req.url).searchParams.get("range") ?? "3M";
  const range = (VALID.includes(rawRange as Range) ? rawRange : "3M") as Range;
  const data = await fetchHistory(symbol, range);
  return NextResponse.json({ range, data });
}
