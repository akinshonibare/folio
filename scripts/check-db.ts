import { config } from "dotenv";
config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const cols = await sql`select column_name from information_schema.columns where table_name='user_settings' order by ordinal_position`;
  console.log(
    "user_settings columns (DATABASE_URL):",
    cols.map((r: { column_name: string }) => r.column_name).join(", "),
  );
  try {
    const mig = await sql`select hash, created_at from drizzle.__drizzle_migrations order by id`;
    console.log("applied migrations:", mig.length);
    for (const m of mig) console.log(" ", m.created_at, m.hash);
  } catch (e) {
    console.log("no drizzle.__drizzle_migrations table:", (e as Error).message);
  }
}
main();
