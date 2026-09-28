import { DEFAULT_CATEGORIES } from "./categories";

const categoryKeywords: Record<string, string[]> = {
  World: ["war", "ukraine", "israel", "gaza", "china", "europe", "africa", "international"],
  "United States": ["congress", "white house", "supreme court", "us", "america", "states"],
  Politics: ["election", "president", "senate", "governor", "party", "vote", "campaign"],
  Business: ["company", "business", "corporate", "revenue", "merger", "retail"],
  Economy: ["inflation", "economy", "jobs", "employment", "gdp", "federal reserve", "interest rate"],
  "Financial Markets": ["stocks", "shares", "market", "bond", "investor", "earnings", "oil prices"],
  AI: ["artificial intelligence", " ai ", "machine learning", "model", "chatgpt", "openai"],
  Technology: ["technology", "software", "hardware", "app", "internet", "chip", "semiconductor"],
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
  Cybersecurity: ["cyber", "hack", "ransomware", "security breach", "malware"],
  Space: ["space", "nasa", "rocket", "moon", "mars", "orbit"],
};

export function classifyLocally(title: string, description = "", fallback = "World") {
  const haystack = ` ${`${title} ${description}`.toLowerCase()} `;
  const ranked = DEFAULT_CATEGORIES.map((category) => ({ category, score: (categoryKeywords[category] ?? []).reduce((score, keyword) => score + (haystack.includes(keyword) ? 1 : 0), 0) })).sort((a, b) => b.score - a.score);
  return ranked[0]?.score ? ranked[0].category : fallback;
}

export function extractLocalTopics(title: string, description = "") {
  const text = `${title} ${description}`;
  return DEFAULT_CATEGORIES.filter((category) => category.toLowerCase().split(" ").some((word) => text.toLowerCase().includes(word)));
}
