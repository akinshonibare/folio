import yahooFinance from "yahoo-finance2";

export type EarningsEvent = {
  symbol: string;
  name: string | null;
  date: string; // YYYY-MM-DD
  kind: "EARNINGS" | "DIVIDEND";
};

type CalendarEvents = {
  earnings?: { earningsDate?: Date[] | Date };
  dividendDate?: Date;
  exDividendDate?: Date;
};

type QuoteSummaryResp = {
  price?: { shortName?: string; longName?: string };
  calendarEvents?: CalendarEvents;
};

/**
 * Look up upcoming earnings + dividend dates for a list of symbols. Yahoo
 * `quoteSummary` returns a single next earnings date per ticker; we treat
 * that as the upcoming event.
 */
export async function fetchUpcomingEvents(
  symbols: string[],
  windowDays = 45,
): Promise<EarningsEvent[]> {
  const out: EarningsEvent[] = [];
  const cutoff = Date.now() + windowDays * 86_400_000;
  await Promise.all(
    symbols.map(async (sym) => {
      try {
        const q = (await yahooFinance.quoteSummary(sym, {
          modules: ["price", "calendarEvents"],
        })) as QuoteSummaryResp;
        const name =
          q.price?.longName ?? q.price?.shortName ?? null;
        const ed = q.calendarEvents?.earnings?.earningsDate;
        if (ed) {
          const dates = Array.isArray(ed) ? ed : [ed];
          for (const d of dates) {
            const t = d instanceof Date ? d.getTime() : new Date(d).getTime();
            if (t >= Date.now() && t <= cutoff) {
              out.push({
                symbol: sym,
                name,
                date: new Date(t).toISOString().slice(0, 10),
                kind: "EARNINGS",
              });
            }
          }
        }
        const dd = q.calendarEvents?.dividendDate;
        if (dd) {
          const t = dd instanceof Date ? dd.getTime() : new Date(dd).getTime();
          if (t >= Date.now() && t <= cutoff) {
            out.push({
              symbol: sym,
              name,
              date: new Date(t).toISOString().slice(0, 10),
              kind: "DIVIDEND",
            });
          }
        }
      } catch {
        /* silent — single symbol failure shouldn't kill the page */
      }
    }),
  );
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
