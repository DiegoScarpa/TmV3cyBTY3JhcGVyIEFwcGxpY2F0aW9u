export type SourceSeed = {
  name: string;
  rssUrl: string;
  websiteUrl: string;
  category: string;
  country: string;
  language?: string;
  reliability: number;
  subtopics?: string[];
  sourceType?: string;
  preferredExtraction?: string;
};

export const INITIAL_SOURCE_SEEDS: SourceSeed[] = [
  { name: "BBC World", rssUrl: "https://feeds.bbci.co.uk/news/world/rss.xml", websiteUrl: "https://www.bbc.com/news/world", category: "World", country: "GB", reliability: 0.9, subtopics: ["World", "Geopolitics"] },
  { name: "NPR News", rssUrl: "https://feeds.npr.org/1001/rss.xml", websiteUrl: "https://www.npr.org/sections/news/", category: "United States", country: "US", reliability: 0.9, subtopics: ["United States", "Politics", "Economy"] },
  { name: "BBC Business", rssUrl: "https://feeds.bbci.co.uk/news/business/rss.xml", websiteUrl: "https://www.bbc.com/news/business", category: "Business", country: "GB", reliability: 0.9, subtopics: ["Business", "Companies", "Global Economy", "Markets"] },
  { name: "The Wall Street Journal Markets", rssUrl: "https://feeds.a.dj.com/rss/RSSMarketsMain.xml", websiteUrl: "https://www.wsj.com/news/markets", category: "Financial Markets", country: "US", reliability: 0.88, subtopics: ["Stock Market", "Bonds", "Interest Rates", "Market Analysis"], preferredExtraction: "DIRECT_OR_SMRY" },
  { name: "Federal Reserve Press Releases", rssUrl: "https://www.federalreserve.gov/feeds/press_all.xml", websiteUrl: "https://www.federalreserve.gov/newsevents/pressreleases.htm", category: "Finance", country: "US", reliability: 0.98, subtopics: ["Federal Reserve", "Interest Rates", "Banking", "Treasury", "Economic Policy"] },
  { name: "MarketWatch Top Stories", rssUrl: "https://feeds.marketwatch.com/marketwatch/topstories/", websiteUrl: "https://www.marketwatch.com/", category: "Financial Markets", country: "US", reliability: 0.82, subtopics: ["Markets", "Stocks", "ETFs", "Earnings", "Economy"] },
  { name: "HousingWire", rssUrl: "https://www.housingwire.com/feed/", websiteUrl: "https://www.housingwire.com/", category: "Real Estate", country: "US", reliability: 0.82, subtopics: ["Housing", "Mortgage Rates", "Home Prices", "Real Estate Investing", "Construction"] },
  { name: "Utility Dive", rssUrl: "https://www.utilitydive.com/feeds/news/", websiteUrl: "https://www.utilitydive.com/", category: "Energy", country: "US", reliability: 0.8, subtopics: ["Energy", "Electricity", "Energy Policy", "Utilities", "Energy Infrastructure"] },
  { name: "Financial Times", rssUrl: "https://www.ft.com/?format=rss", websiteUrl: "https://www.ft.com/", category: "Finance", country: "GB", reliability: 0.94, subtopics: ["Global Business", "Markets", "Economy", "Companies", "Finance", "M&A", "Private Equity", "Geopolitics", "Energy"] },
  { name: "Business Insider", rssUrl: "https://www.businessinsider.com/rss", websiteUrl: "https://www.businessinsider.com/", category: "Business", country: "US", reliability: 0.82, subtopics: ["Business", "Companies", "Markets", "Finance", "Startups", "Technology", "Retail", "Economy"] },
  { name: "Supply Chain Dive", rssUrl: "https://www.supplychaindive.com/feeds/news/", websiteUrl: "https://www.supplychaindive.com/", category: "Business", country: "US", reliability: 0.84, subtopics: ["Supply Chain", "Logistics", "Freight", "Operations", "Manufacturing", "Retail", "Transportation", "Procurement", "Warehousing"] },
  { name: "The Verge", rssUrl: "https://www.theverge.com/rss/index.xml", websiteUrl: "https://www.theverge.com/", category: "Technology", country: "US", reliability: 0.82, subtopics: ["Technology", "AI", "Companies"] },
  { name: "TechCrunch", rssUrl: "https://techcrunch.com/feed/", websiteUrl: "https://techcrunch.com/", category: "Startups", country: "US", reliability: 0.8, subtopics: ["Startups", "Venture Capital", "Technology", "AI"] },
  { name: "Ars Technica", rssUrl: "https://feeds.arstechnica.com/arstechnica/index", websiteUrl: "https://arstechnica.com/", category: "Technology", country: "US", reliability: 0.86, subtopics: ["Technology", "AI", "Cybersecurity", "Space"] },
  { name: "NASA Breaking News", rssUrl: "https://www.nasa.gov/rss/dyn/breaking_news.rss", websiteUrl: "https://www.nasa.gov/news/", category: "Space", country: "US", reliability: 0.92, subtopics: ["Space", "Science"] },
];
