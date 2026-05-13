import { NextResponse } from "next/server";
import { getApiUserId } from "@/lib/auth/session";
import { searchTickers } from "@/lib/search/tickers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const userId = await getApiUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const q = new URL(req.url).searchParams.get("q") ?? "";
  const hits = await searchTickers(q);
  return NextResponse.json({ hits });
}
