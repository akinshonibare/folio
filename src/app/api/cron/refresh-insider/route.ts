import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/auth/cron";
import { getAllHeldSymbols } from "@/lib/db/calendar";
import { refreshInsiderForSymbol } from "@/lib/finnhub/insider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const symbols = await getAllHeldSymbols();
  let total = 0;
  for (const s of symbols) {
    const r = await refreshInsiderForSymbol(s);
    total += r.rows;
  }
  return NextResponse.json({ symbols: symbols.length, rows: total });
}
