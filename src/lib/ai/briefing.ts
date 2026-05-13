import { aiClient, AI_MODEL } from "./anthropic";
import type { MovementRow } from "@/lib/portfolio/aggregate";
import { fetchYahooNews } from "@/lib/news/yahoo";

export type Briefing = {
  paragraph: string;
  top: Array<{ symbol: string; deltaPct: number; deltaCad: number }>;
};

const SYSTEM = `You are a financial analyst writing a brief portfolio update for the owner.

Given the user's biggest position movers since their last snapshot, plus recent headlines, write a 3–4 sentence "what changed" briefing.

Rules:
- Personal tone — "your" position, "you're". Plain English.
- Lead with what mattered most in dollar terms, not just percentage.
- Mention at most 2–3 specific tickers; group the rest as "smaller moves".
- Reference news only when it directly explains a move. Don't speculate.
- No recommendations. Stick to factual synthesis.
- End with a one-sentence summary line.`;

export async function buildBriefing(
  movement: MovementRow[],
): Promise<Briefing | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (movement.length === 0) return null;

  const ranked = [...movement]
    .filter((m) => m.previousValueCad > 0)
    .sort((a, b) => Math.abs(b.deltaCad) - Math.abs(a.deltaCad))
    .slice(0, 5);
  if (ranked.length === 0) return null;

  // Pull a couple of headlines for each top mover to give the model
  // something to cite.
  const headlines = await Promise.all(
    ranked.slice(0, 3).map(async (m) => {
      const news = await fetchYahooNews(m.symbol, 3).catch(() => []);
      return {
        symbol: m.symbol,
        items: news,
      };
    }),
  );

  const moverBlock = ranked
    .map(
      (m) =>
        `- ${m.symbol}: ${m.deltaPct >= 0 ? "+" : ""}${m.deltaPct.toFixed(2)}% (${m.deltaCad >= 0 ? "+" : ""}${m.deltaCad.toFixed(0)} CAD)`,
    )
    .join("\n");

  const newsBlock = headlines
    .filter((h) => h.items.length)
    .map(
      (h) =>
        `Headlines for ${h.symbol}:\n${h.items
          .map((n) => `  - "${n.title}" (${n.publisher ?? "unknown"})`)
          .join("\n")}`,
    )
    .join("\n\n") || "(no headlines)";

  const userPrompt = `Movers since last snapshot:
${moverBlock}

${newsBlock}

Write the briefing now.`;

  const response = await aiClient().messages.create({
    model: AI_MODEL,
    max_tokens: 380,
    system: [
      {
        type: "text",
        text: SYSTEM,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = response.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();

  return {
    paragraph: text,
    top: ranked.slice(0, 3).map((m) => ({
      symbol: m.symbol,
      deltaPct: m.deltaPct,
      deltaCad: m.deltaCad,
    })),
  };
}
