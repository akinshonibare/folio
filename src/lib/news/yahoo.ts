import { yahoo as yahooFinance } from "@/lib/yahoo/client";

export type NewsItem = {
  providerId: string;
  title: string;
  link: string;
  publisher: string | null;
  publishedAt: Date;
};

type YahooSearchNews = {
  uuid?: string;
  title?: string;
  link?: string;
  publisher?: string;
  // yahoo-finance2 v3 deserialises this to a Date; some versions used a
  // unix epoch number. Accept either.
  providerPublishTime?: Date | number;
};

type YahooSearchResult = {
  news?: YahooSearchNews[];
};

/**
 * Pull recent news headlines for a ticker via Yahoo's search endpoint.
 * Free, no key, but unofficial — handle errors gracefully.
 */
export async function fetchYahooNews(
  symbol: string,
  count = 8,
): Promise<NewsItem[]> {
  try {
    const result = (await yahooFinance.search(symbol, {
      newsCount: count,
      quotesCount: 0,
    })) as unknown as YahooSearchResult;
    const news = result.news ?? [];
    return news
      .filter((n) => n.uuid && n.title && n.link && n.providerPublishTime)
      .map((n) => {
        const pt = n.providerPublishTime!;
        const publishedAt =
          pt instanceof Date ? pt : new Date(pt * 1000);
        return {
          providerId: n.uuid!,
          title: n.title!,
          link: n.link!,
          publisher: n.publisher ?? null,
          publishedAt,
        };
      });
  } catch {
    return [];
  }
}
