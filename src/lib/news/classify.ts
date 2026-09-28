import { DEFAULT_CATEGORIES } from "./categories";

const categoryKeywords: Record<string, string[]> = {
  World: ["war", "ukraine", "israel", "gaza", "china", "europe", "africa", "international"],
  "United States": ["congress", "white house", "supreme court", "us", "america", "states"],
  Politics: ["election", "president", "senate", "governor", "party", "vote", "campaign"],
  Law: ["lawsuit", "court", "legal", "regulation", "antitrust", "judge"],
  Defense: ["military", "defense", "missile", "pentagon", "army", "navy"],
  Business: ["company", "business", "corporate", "revenue", "merger", "acquisition", "retail", "manufacturing", "supply chain", "ceo"],
  Finance: ["banking", "investment", "investing", "finance", "etf", "ipo", "dividend", "forex"],
  Economy: ["inflation", "economy", "jobs", "employment", "gdp", "federal reserve", "interest rate", "wages", "consumer spending", "recession"],
  "Financial Markets": ["stocks", "shares", "market", "bond", "investor", "earnings", "oil prices", "nasdaq", "s&p 500", "dow jones", "treasury"],
  "Real Estate": ["housing", "home prices", "mortgage", "commercial real estate", "rent", "construction", "reit", "property"],
  AI: ["artificial intelligence", " ai ", "machine learning", "model", "chatgpt", "openai"],
  Technology: ["technology", "software", "hardware", "app", "internet", "chip", "semiconductor", "data center", "cloud"],
  Startups: ["startup", "venture", "funding", "seed round", "founder"],
  Science: ["research", "study", "scientists", "discovery", "biology", "physics"],
  Energy: ["energy", "oil", "gas", "solar", "wind", "nuclear", "power grid"],
  Climate: ["climate", "warming", "emissions", "drought", "flood", "weather"],
  Healthcare: ["health", "hospital", "drug", "medicine", "disease", "patient"],
  Education: ["school", "university", "student", "teacher", "education"],
  Sports: ["football", "soccer", "nba", "nfl", "olympic", "sport"],
  Gaming: ["game", "gaming", "playstation", "xbox", "nintendo"],
  Entertainment: ["film", "movie", "music", "actor", "television", "celebrity"],
  Travel: ["travel", "airline", "airport", "hotel", "tourism"],
  Transportation: ["transportation", "shipping", "freight", "logistics", "rail"],
  Automotive: ["automotive", "car", "vehicle", "ev", "electric vehicle"],
  Food: ["food", "grocery", "restaurant", "agriculture"],
  Lifestyle: ["lifestyle", "fashion", "wellness", "consumer"],
  Cybersecurity: ["cyber", "hack", "ransomware", "security breach", "malware"],
  Space: ["space", "nasa", "rocket", "moon", "mars", "orbit"],
};

export function classifyLocally(title: string, description = "", fallback = "World") {
  const haystack = ` ${`${title} ${description}`.toLowerCase()} `;
  const ranked = DEFAULT_CATEGORIES.map((category) => ({ category, score: (categoryKeywords[category] ?? []).reduce((score, keyword) => score + (haystack.includes(keyword) ? 1 : 0), 0) })).sort((a, b) => b.score - a.score);
  return ranked[0]?.score ? ranked[0].category : fallback;
}

const topicKeywords: Record<string, string[]> = {
  Companies: ["company", "companies", "corporate"], "Corporate News": ["corporate"], "Mergers & Acquisitions": ["merger", "acquisition", "acquire"], Earnings: ["earnings", "revenue", "profit", "eps", "guidance"], "CEOs & Executives": ["ceo", "executive"], Management: ["management", "manager"], "Private Equity": ["private equity", "buyout"], "Venture Capital": ["venture capital", "funding round", "series a", "series b"], Startups: ["startup", "founder", "seed round"], "Small Business": ["small business"], Retail: ["retail", "store sales"], Manufacturing: ["manufacturing", "factory", "plant"], "Supply Chain": ["supply chain", "supplier", "logistics", "shipping"], "Corporate Strategy": ["strategy", "strategic"], "Industry Trends": ["industry trend"],
  "Stock Market": ["stocks", "shares", "stock market"], "S&P 500": ["s&p 500", "s&p"], Nasdaq: ["nasdaq"], "Dow Jones": ["dow jones"], Bonds: ["bond", "bonds"], Treasury: ["treasury", "treasuries"], "Interest Rates": ["interest rate", "borrowing cost"], "Federal Reserve": ["federal reserve", "fed", "fomc"], Banking: ["bank", "banking"], Investing: ["investing", "investor"], Forex: ["forex", "dollar", "currency"], Commodities: ["commodity", "commodities"], ETFs: ["etf"], IPOs: ["ipo"], Dividends: ["dividend"],
  Housing: ["housing", "home sales"], "Home Prices": ["home prices", "house prices"], "Mortgage Rates": ["mortgage rate", "mortgage"], "Commercial Real Estate": ["commercial real estate", "office building"], Construction: ["construction"], "Property Development": ["property development", "developer"], Rentals: ["rent", "rental"], REITs: ["reit"], "Urban Development": ["urban development"],
  Inflation: ["inflation", "cpi", "pce"], GDP: ["gdp"], Employment: ["employment", "jobs report"], Unemployment: ["unemployment"], "Consumer Spending": ["consumer spending", "retail spending"], Wages: ["wage", "pay growth"], Taxes: ["tax"], Trade: ["trade", "tariff", "export", "import"], Recession: ["recession"], "Labor Market": ["labor market"], "Global Economy": ["global economy"], Productivity: ["productivity"], "Economic Growth": ["economic growth"],
  Oil: ["oil", "crude"], "Natural Gas": ["natural gas"], Electricity: ["electricity", "power grid"], "Nuclear Energy": ["nuclear"], Solar: ["solar"], Wind: ["wind power"], Hydropower: ["hydropower"], Batteries: ["battery", "batteries"], "Energy Storage": ["energy storage"], "Energy Markets": ["energy market"], "Energy Policy": ["energy policy"], "Critical Minerals": ["critical minerals"], Lithium: ["lithium"], Hydrogen: ["hydrogen"], Refining: ["refining", "refinery"], "Energy Infrastructure": ["energy infrastructure"],
};

export function extractLocalTopics(title: string, description = "") {
  const text = `${title} ${description}`.toLowerCase();
  return Object.entries(topicKeywords).filter(([, keywords]) => keywords.some((keyword) => text.includes(keyword))).map(([topic]) => topic);
}
