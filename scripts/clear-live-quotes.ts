import { config } from "dotenv";
config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const r = await sql`delete from live_quotes returning instrument_id`;
  console.log(`cleared ${r.length} live_quotes rows`);
}
main();
