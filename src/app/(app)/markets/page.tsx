import { ensureUserRow } from "@/lib/auth/session";
import { fetchIndices } from "@/lib/markets/indices";
import { fetchScreener } from "@/lib/markets/movers";
import { TopBar } from "@/components/ui/TopBar";
import { Section } from "@/components/ui/Section";
import { IndexCard } from "@/components/markets/IndexCard";
import { MoversList } from "@/components/markets/MoversList";
import { MarketsTabs } from "@/components/markets/MarketsTabs";

export const dynamic = "force-dynamic";

export default async function MarketsPage() {
  await ensureUserRow();
  const [indices, gainers, losers, mostActive] = await Promise.all([
    fetchIndices("overview"),
    fetchScreener("day_gainers", 10),
    fetchScreener("day_losers", 10),
    fetchScreener("most_actives", 10),
  ]);

  return (
    <>
      <TopBar title="Markets" />
      <div className="space-y-6 pt-2">
        <MarketsTabs />

        <Section subhead="The world today" title="Indices">
          <div className="h-scroll -mx-4 px-4">
            {indices.map((q) => (
              <IndexCard key={q.symbol} q={q} />
            ))}
          </div>
        </Section>

        <Section subhead="What people are trading" title="Most Active">
          <MoversList items={mostActive} />
        </Section>

        <Section subhead="Best of the day" title="Top Gainers">
          <MoversList items={gainers} />
        </Section>

        <Section subhead="Worst of the day" title="Top Losers">
          <MoversList items={losers} />
        </Section>
      </div>
    </>
  );
}
