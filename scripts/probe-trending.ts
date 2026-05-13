import { config } from "dotenv";
config({ path: ".env.local" });
import { yahoo } from "../src/lib/yahoo/client";

async function main() {
  try {
    const j = (await (
      yahoo.trendingSymbols as unknown as (
        region: string,
        queryOptions: Record<string, never>,
        moduleOptions: { validateResult: false },
      ) => Promise<unknown>
    )("US", {}, { validateResult: false })) as {
      finance?: { result?: Array<{ quotes?: Array<{ symbol?: string }> }> };
    };
    const syms = (j.finance?.result?.[0]?.quotes ?? [])
      .map((q) => q.symbol)
      .filter(Boolean);
    console.log("trending count:", syms.length);
    console.log("first 5:", syms.slice(0, 5));
    console.log("raw:", JSON.stringify(j).slice(0, 800));
  } catch (e) {
    console.log("ERR", (e as Error).message);
  }
}
main();
