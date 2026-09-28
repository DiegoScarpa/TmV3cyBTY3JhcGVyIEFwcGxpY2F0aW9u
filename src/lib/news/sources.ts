export type SourceDefinition = {
  name: string;
  rssUrl: string;
  websiteUrl: string;
  category: string;
  country: string;
  language: string;
  reliability: number;
};

export const INITIAL_SOURCES: SourceDefinition[] = [
  { name: "BBC World", rssUrl: "https://feeds.bbci.co.uk/news/world/rss.xml", websiteUrl: "https://www.bbc.com/news/world", category: "World", country: "GB", language: "en", reliability: 0.9 },
  { name: "NPR News", rssUrl: "https://feeds.npr.org/1001/rss.xml", websiteUrl: "https://www.npr.org/sections/news/", category: "United States", country: "US", language: "en", reliability: 0.9 },
  { name: "BBC Business", rssUrl: "https://feeds.bbci.co.uk/news/business/rss.xml", websiteUrl: "https://www.bbc.com/news/business", category: "Business", country: "GB", language: "en", reliability: 0.9 },
  { name: "WSJ Markets", rssUrl: "https://feeds.a.dj.com/rss/RSSMarketsMain.xml", websiteUrl: "https://www.wsj.com/news/markets", category: "Financial Markets", country: "US", language: "en", reliability: 0.88 },
  { name: "The Verge", rssUrl: "https://www.theverge.com/rss/index.xml", websiteUrl: "https://www.theverge.com/", category: "Technology", country: "US", language: "en", reliability: 0.82 },
  { name: "TechCrunch", rssUrl: "https://techcrunch.com/feed/", websiteUrl: "https://techcrunch.com/", category: "Startups", country: "US", language: "en", reliability: 0.8 },
  { name: "Ars Technica", rssUrl: "https://feeds.arstechnica.com/arstechnica/index", websiteUrl: "https://arstechnica.com/", category: "Technology", country: "US", language: "en", reliability: 0.86 },
  { name: "NASA Breaking News", rssUrl: "https://www.nasa.gov/rss/dyn/breaking_news.rss", websiteUrl: "https://www.nasa.gov/news/", category: "Space", country: "US", language: "en", reliability: 0.92 },
];
