import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureUserRow } from "@/lib/auth/session";
import { parseWealthsimpleCsv } from "@/lib/csv/parse";
import { ingestCsv } from "@/lib/db/upsert";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  csv: z.string().min(20).max(5_000_000),
  filename: z.string().max(256).optional(),
});

export async function POST(req: Request) {
  let userId: string;
  try {
    userId = await ensureUserRow();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  let csv;
  try {
    csv = parseWealthsimpleCsv(parsed.data.csv);
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error ? e.message : "Could not parse CSV",
      },
      { status: 422 },
    );
  }

  const result = await ingestCsv(userId, csv);
  return NextResponse.json(result);
}
