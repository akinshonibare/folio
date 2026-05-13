import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/auth/cron";
import { getAllHeldSymbols } from "@/lib/db/calendar";
import { refreshEarningsForSymbols } from "@/lib/finnhub/earnings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const symbols = await getAllHeldSymbols();
  const result = await refreshEarningsForSymbols(symbols);
  return NextResponse.json(result);
}
