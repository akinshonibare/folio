import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureUserRowForApi } from "@/lib/auth/session";
import {
  addToWatchlist,
  removeFromWatchlist,
  findOrCreateInstrument,
} from "@/lib/db/watchlist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PostBody = z.object({
  symbol: z.string().min(1).max(40),
  exchange: z.string().max(20).optional(),
  name: z.string().max(200).optional(),
  kind: z.enum(["EQUITY", "EXCHANGE_TRADED_FUND", "CRYPTOCURRENCY", "OTHER"]).default("EQUITY"),
  notes: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  const userId = await ensureUserRowForApi();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = PostBody.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const instrumentId = await findOrCreateInstrument({
    symbol: body.data.symbol,
    exchange: body.data.exchange,
    name: body.data.name,
    kind: body.data.kind,
  });
  await addToWatchlist(userId, instrumentId, body.data.notes);
  return NextResponse.json({ instrumentId });
}

const DeleteBody = z.object({ instrumentId: z.number().int().positive() });

export async function DELETE(req: Request) {
  const userId = await ensureUserRowForApi();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = DeleteBody.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  await removeFromWatchlist(userId, body.data.instrumentId);
  return NextResponse.json({ ok: true });
}
