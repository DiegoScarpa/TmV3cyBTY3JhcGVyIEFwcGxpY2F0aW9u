import { slugifyCategory } from "./categories";

export type TopicGroup = { name: string; slug: string; topics: string[] };

export const TOPIC_GROUPS: TopicGroup[] = [
  { name: "Business", slug: "business", topics: ["Companies", "Corporate News", "Mergers & Acquisitions", "Earnings", "CEOs & Executives", "Management", "Private Equity", "Venture Capital", "Startups", "Small Business", "Retail", "Manufacturing", "Supply Chain", "Development", "Corporate Strategy", "Business Models", "Industry Trends", "Entrepreneurship", "Leadership"] },
  { name: "Finance & Markets", slug: "finance-markets", topics: ["Stock Market", "S&P 500", "Nasdaq", "Dow Jones", "Bonds", "Treasury", "Interest Rates", "Federal Reserve", "Banking", "Investment", "Investing", "Forex", "Commodities", "ETFs", "IPOs", "Dividends", "Earnings", "Market Analysis"] },
  { name: "Real Estate", slug: "real-estate", topics: ["Housing", "Home Prices", "Mortgage Rates", "Commercial Real Estate", "Construction", "Property Development", "Rentals", "Real Estate Investing", "REITs", "Architecture", "Urban Development", "Real Estate Development"] },
  { name: "Economy", slug: "economy", topics: ["Inflation", "GDP", "Employment", "Unemployment", "Interest Rates", "Consumer Spending", "Wages", "Taxes", "Government Spending", "Trade", "Recession", "Economic Policy", "Labor Market", "Global Economy", "Consumer Confidence", "Productivity", "Economic Growth"] },
  { name: "Energy", slug: "energy", topics: ["Oil", "Natural Gas", "Electricity", "Nuclear Energy", "Solar", "Wind", "Hydropower", "Batteries", "Energy Storage", "Energy Markets", "Energy Policy", "Critical Minerals", "Lithium", "Hydrogen", "Refining", "Energy Infrastructure"] },
  { name: "Technology & AI", slug: "technology-ai", topics: ["AI", "Technology", "Semiconductors", "Data Centers", "Cloud Computing", "Cybersecurity", "Space"] },
  { name: "Other", slug: "other", topics: ["Healthcare", "Climate", "World", "United States", "Politics", "Law", "Defense", "Transportation", "Automotive", "Education", "Sports", "Gaming", "Entertainment", "Travel", "Food", "Lifestyle", "Science"] },
];

export const ALL_TOPICS = TOPIC_GROUPS.flatMap((group, groupIndex) => group.topics.map((name, sortOrder) => ({ name, slug: slugifyCategory(name), group: group.name, groupSlug: group.slug, sortOrder: groupIndex * 100 + sortOrder })));

export const BUSINESS_NAV = [
  { label: "Companies", topic: "companies" }, { label: "M&A", topic: "mergers-acquisitions" }, { label: "Earnings", topic: "earnings" }, { label: "Private Equity", topic: "private-equity" }, { label: "Venture Capital", topic: "venture-capital" }, { label: "Startups", topic: "startups" }, { label: "Small Business", topic: "small-business" }, { label: "Management", topic: "management" }, { label: "Manufacturing", topic: "manufacturing" }, { label: "Supply Chain", topic: "supply-chain" }, { label: "Retail", topic: "retail" },
];

export const FINANCE_NAV = [
  { label: "Stocks", topic: "stock-market" }, { label: "S&P 500", topic: "s-p-500" }, { label: "Nasdaq", topic: "nasdaq" }, { label: "Dow", topic: "dow-jones" }, { label: "Bonds", topic: "bonds" }, { label: "Treasury", topic: "treasury" }, { label: "Fed", topic: "federal-reserve" }, { label: "Interest Rates", topic: "interest-rates" }, { label: "ETFs", topic: "etfs" }, { label: "IPOs", topic: "ipos" }, { label: "Forex", topic: "forex" }, { label: "Commodities", topic: "commodities" },
];
