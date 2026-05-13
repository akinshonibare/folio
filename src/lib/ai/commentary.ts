import { aiClient, AI_MODEL } from "./anthropic";
import { fetchYahooNews, type NewsItem } from "@/lib/news/yahoo";
import { fetchStockTwitsSentiment } from "@/lib/sentiment/stocktwits";
import { yahooSymbolFor } from "@/lib/markets/symbol";

export type Commentary = {
  paragraph: string;
  citations: { title: string; link: string; publisher: string | null }[];
};

const SYSTEM = `You are a financial market analyst writing for a personal portfolio app.

When given a stock's recent news headlines and crowd sentiment, write a concise 2–3 sentence explanation of why the stock is moving today.

Rules:
- Be factual and neutral. No buy/sell recommendations.
- Reference specific headlines when they exist; quote a few words from them if it helps.
- If news is sparse, acknowledge that and discuss the sentiment signal instead.
- 2–3 sentences max. Plain English. Direct — don't start with "Today, XYZ stock…".
- Never invent specifics not in the input.`;

/**
 * Produce a "Why is it moving" paragraph for a single symbol, using recent
 * news + crowd sentiment as evidence. Returns null only when the AI key is
 * missing; if news + sentiment are empty we still produce a brief
 * acknowledgement so the UI never goes silent.
 */
export async function explainMovement(params: {
  symbol: string;
  name: string | null;
  changePct: number | null;
  exchange?: string | null;
  securityType?: string | null;
}): Promise<Commentary | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  // Resolve to the right Yahoo symbol so CDR positions (GOOG on TSX) pull
  // CAD-listing news, not the US-share news.
  const yahooSym = yahooSymbolFor({
    symbol: params.symbol,
    exchange: params.exchange ?? null,
    securityType: params.securityType ?? "EQUITY",
  });

  const [news, sentiment] = await Promise.all([
    fetchYahooNews(yahooSym, 8).catch(() => [] as NewsItem[]),
    fetchStockTwitsSentiment(params.symbol).catch(() => null),
  ]);

  const newsBlock =
    news.length === 0
      ? "(no recent headlines)"
      : news
          .slice(0, 6)
          .map(
            (n, i) =>
              `${i + 1}. "${n.title}" — ${n.publisher ?? "unknown"}, ${new Date(
                n.publishedAt,
              )
                .toISOString()
                .slice(0, 10)}`,
          )
          .join("\n");

  const sentBlock = sentiment
    ? `StockTwits: ${sentiment.bullPct != null ? `${sentiment.bullPct.toFixed(0)}% bull` : "no tagged sentiment"}, ${sentiment.mentions24h} mentions/24h (sample ${sentiment.sampleSize})`
    : "No crowd sentiment signal.";

  const userPrompt = `Stock: ${params.symbol}${params.name ? ` (${params.name})` : ""}
Day change: ${
    params.changePct != null
      ? `${params.changePct >= 0 ? "+" : ""}${params.changePct.toFixed(2)}%`
      : "unknown"
  }

Recent headlines:
${newsBlock}

${sentBlock}

Write the explanation now.`;

  const response = await aiClient().messages.create({
    model: AI_MODEL,
    max_tokens: 280,
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
    citations: news.slice(0, 3).map((n) => ({
      title: n.title,
      link: n.link,
      publisher: n.publisher,
    })),
  };
}
