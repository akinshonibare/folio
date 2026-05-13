import yahooFinance from "yahoo-finance2";

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
  providerPublishTime?: number;
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
    })) as YahooSearchResult;
    const news = result.news ?? [];
    return news
      .filter((n) => n.uuid && n.title && n.link && n.providerPublishTime)
      .map((n) => ({
        providerId: n.uuid!,
        title: n.title!,
        link: n.link!,
        publisher: n.publisher ?? null,
        publishedAt: new Date(n.providerPublishTime! * 1000),
      }));
  } catch {
    return [];
  }
}
