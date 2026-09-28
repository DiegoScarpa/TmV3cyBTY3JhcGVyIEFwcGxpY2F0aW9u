import { isMeaningfulImpact, normalizeStoryAnalysis, type StoryAnalysis } from "../analysis";

export type ReelTopic = "all" | "my-feed" | "ai" | "technology" | "business" | "finance" | "economy" | "markets" | "real-estate" | "energy" | "world" | "united-states" | "science" | "sports" | "gaming" | "startups" | "cybersecurity" | "space" | "companies" | "ipos" | "earnings" | "private-equity" | "venture-capital" | "supply-chain" | "federal-reserve";
export type ReelDensity = "compact" | "balanced" | "detailed";
export type ReelSelection = ReelTopic | string[];

export type ReelPreferences = { topics: string[]; countries: string[]; companies: string[]; people: string[]; keywords: string[]; hiddenTopics: string[] };
export type ReelStory = {
  id: string; headline: string; summary: string | null; whyItMatters: string | null; category: string; categorySlug: string; latestPublishedAt: string | null; lastUpdatedAt: string | null; firstReportedAt: string | null; sourceNames: string[]; sourceUrl: string | null; imageUrl: string | null; topics: string[]; entities: string[]; importanceScore: number; relevanceScore: number; confidence: string; keyFacts: string[]; analysis: StoryAnalysis | null;
};
export type ReelStoryRecord = {
  id: string; headline: string; summary: string | null; whyItMatters: string | null; primaryCategory: { name: string; slug: string }; latestPublishedAt: Date | string | null; lastUpdatedAt: Date | string | null; firstReportedAt: Date | string | null; importanceScore: number; relevanceScore: number; confidence: string; keyFacts: unknown; analysis: unknown; topics: unknown; entities: unknown;
  storySources: Array<{ source: { name: string }; article: { originalUrl: string; imageUrl: string | null; publishedAt: Date | string | null; discoveredAt: Date | string | null } }>;
};

export const reelTopicOptions: Array<{ value: ReelTopic; label: string }> = [
  { value: "all", label: "All News" }, { value: "my-feed", label: "My Feed" }, { value: "business", label: "Business" }, { value: "finance", label: "Finance" }, { value: "markets", label: "Markets" }, { value: "economy", label: "Economy" }, { value: "real-estate", label: "Real Estate" }, { value: "energy", label: "Energy" }, { value: "technology", label: "Technology" }, { value: "ai", label: "AI" }, { value: "world", label: "World" }, { value: "united-states", label: "United States" }, { value: "science", label: "Science" }, { value: "sports", label: "Sports" }, { value: "gaming", label: "Gaming" }, { value: "startups", label: "Startups" }, { value: "cybersecurity", label: "Cybersecurity" }, { value: "space", label: "Space" },
];

export const reelPresets: Array<{ value: ReelTopic; label: string }> = [
  { value: "business", label: "Business Reel" }, { value: "ipos", label: "IPO Reel" }, { value: "private-equity", label: "Private Equity Reel" }, { value: "venture-capital", label: "Venture Capital Reel" }, { value: "earnings", label: "Earnings Reel" }, { value: "supply-chain", label: "Supply Chain Reel" }, { value: "federal-reserve", label: "Federal Reserve Reel" }, { value: "real-estate", label: "Real Estate Reel" }, { value: "energy", label: "Energy Reel" },
];

export const reelDensityOptions: Array<{ value: ReelDensity; label: string; description: string }> = [
  { value: "compact", label: "Compact", description: "Headline, summary, key impact" }, { value: "balanced", label: "Balanced", description: "Adds direct, indirect, and people impact" }, { value: "detailed", label: "Detailed", description: "Adds markets, geography, facts, and flows" },
];

function asStringArray(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; }
function toIso(value: Date | string | null) { if (!value) return null; const date = new Date(value); return Number.isNaN(date.getTime()) ? null : date.toISOString(); }

export function toReelStory(story: ReelStoryRecord): ReelStory {
  const sources = [...story.storySources].sort((left, right) => new Date(right.article.publishedAt ?? right.article.discoveredAt ?? 0).getTime() - new Date(left.article.publishedAt ?? left.article.discoveredAt ?? 0).getTime());
  const imageSource = sources.find((item) => item.article.imageUrl) ?? sources[0];
  return { id: story.id, headline: story.headline, summary: story.summary, whyItMatters: story.whyItMatters, category: story.primaryCategory.name, categorySlug: story.primaryCategory.slug, latestPublishedAt: toIso(story.latestPublishedAt), lastUpdatedAt: toIso(story.lastUpdatedAt), firstReportedAt: toIso(story.firstReportedAt), sourceNames: [...new Set(sources.map((item) => item.source.name))], sourceUrl: sources[0]?.article.originalUrl ?? null, imageUrl: imageSource?.article.imageUrl ?? null, topics: asStringArray(story.topics), entities: asStringArray(story.entities), importanceScore: story.importanceScore, relevanceScore: story.relevanceScore, confidence: story.confidence, keyFacts: asStringArray(story.keyFacts), analysis: normalizeStoryAnalysis(story.analysis) };
}

export function getNewsReelDurationSeconds(value = process.env.NEWS_REEL_DURATION_SECONDS) { const parsed = Number(value ?? 20); return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 3600) : 20; }
function normalized(value: string) { return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function topicSet(story: ReelStory) { return new Set([story.categorySlug, normalized(story.category), ...story.topics.map(normalized)]); }
function storySearchText(story: ReelStory) { return normalized([story.headline, story.summary ?? "", story.category, ...story.topics, ...story.entities].join(" ")); }
function preferenceMatch(story: ReelStory, preferences: ReelPreferences) { const haystack = storySearchText(story); const interests = [...preferences.topics, ...preferences.countries, ...preferences.companies, ...preferences.people, ...preferences.keywords].map(normalized).filter(Boolean); return interests.length ? interests.filter((interest) => haystack.includes(interest)).length / interests.length : 0; }
function isHidden(story: ReelStory, preferences: ReelPreferences) { const hidden = preferences.hiddenTopics.map(normalized); const topics = topicSet(story); return hidden.some((value) => topics.has(value)); }

const businessSubtopics = new Set(["companies", "corporate-news", "mergers-acquisitions", "earnings", "ceos-executives", "management", "private-equity", "venture-capital", "startups", "small-business", "retail", "manufacturing", "supply-chain", "development", "corporate-strategy", "business-models", "industry-trends", "entrepreneurship", "leadership"]);
const financeSubtopics = new Set(["stock-market", "s-p-500", "nasdaq", "dow-jones", "bonds", "treasury", "interest-rates", "federal-reserve", "banking", "investment", "investing", "forex", "commodities", "etfs", "ipos", "dividends", "earnings", "market-analysis"]);

function matchesTopic(story: ReelStory, topic: string) {
  const topics = topicSet(story);
  if (topic === "all") return true;
  if (topic === "my-feed") return true;
  if (topic === "business") return story.categorySlug === "business" || [...topics].some((value) => businessSubtopics.has(value));
  if (topic === "finance") return ["finance", "financial-markets"].includes(story.categorySlug) || [...topics].some((value) => financeSubtopics.has(value));
  if (topic === "markets") return story.categorySlug === "financial-markets" || ["stock-market", "s-p-500", "nasdaq", "dow-jones", "market-analysis"].some((value) => topics.has(value));
  if (topic === "technology") return ["technology", "technology-ai"].includes(story.categorySlug) || topics.has("technology");
  if (topic === "ai") return topics.has("ai") || story.categorySlug === "ai";
  if (topic === "ipos") return topics.has("ipos");
  if (topic === "private-equity") return topics.has("private-equity");
  if (topic === "venture-capital") return topics.has("venture-capital");
  if (topic === "supply-chain") return topics.has("supply-chain");
  if (topic === "federal-reserve") return topics.has("federal-reserve");
  return topics.has(topic) || story.categorySlug === topic;
}

function timestampFor(story: ReelStory) { return new Date(story.latestPublishedAt ?? story.lastUpdatedAt ?? 0).getTime(); }
function hasUsableCoverage(story: ReelStory) { return Boolean(story.sourceNames.length && timestampFor(story) > 0 && (story.summary || story.analysis?.whatHappened)); }

function diversifyStories(stories: ReelStory[]) {
  const remaining = [...stories]; const result: ReelStory[] = []; const recentSources: string[] = [];
  while (remaining.length) {
    const index = remaining.findIndex((story) => story.sourceNames.length === 0 || !story.sourceNames.some((source) => recentSources.includes(source)));
    const chosen = remaining.splice(index < 0 ? 0 : index, 1)[0];
    result.push(chosen);
    for (const source of chosen.sourceNames) { recentSources.push(source); if (recentSources.length > 3) recentSources.shift(); }
  }
  return result;
}

export function reelSelectionLabel(selection: ReelSelection) {
  const values = Array.isArray(selection) ? selection : [selection];
  if (values.includes("all")) return "All News Reel";
  if (values.length === 1) return `${reelPresets.find((preset) => preset.value === values[0])?.label ?? reelTopicOptions.find((topic) => topic.value === values[0])?.label ?? values[0]}${values[0] === "my-feed" ? "" : " Reel"}`;
  return "My News Reel";
}

export function rankReelStories(stories: ReelStory[], selection: ReelSelection, preferences: ReelPreferences, now = Date.now()) {
  const filters = Array.isArray(selection) ? [...new Set(selection)] : [selection];
  const all = filters.length === 0 || filters.includes("all");
  const ranked = stories
    .filter((story, index, allStories) => allStories.findIndex((candidate) => candidate.id === story.id) === index)
    .filter((story) => hasUsableCoverage(story) && !isHidden(story, preferences) && (all || filters.some((filter) => matchesTopic(story, filter))) && (!filters.includes("my-feed") || !(["topics", "countries", "companies", "people", "keywords"].some((key) => (preferences[key as keyof ReelPreferences] as string[]).length)) || preferenceMatch(story, preferences) > 0))
    .map((story) => {
      const published = timestampFor(story); const updated = new Date(story.lastUpdatedAt ?? 0).getTime(); const ageHours = Math.max(0, (now - published) / 3_600_000); const recency = Math.exp(-ageHours / 72); const meaningfulUpdate = updated > published + 60_000 ? 1 : 0; const relevance = filters.includes("my-feed") ? preferenceMatch(story, preferences) : Math.min(1, story.relevanceScore); const score = recency * 0.55 + meaningfulUpdate * 0.2 + relevance * 0.15 + Math.min(1, story.importanceScore) * 0.1;
      return { story, score };
    })
    .sort((left, right) => right.score - left.score || timestampFor(right.story) - timestampFor(left.story) || new Date(right.story.lastUpdatedAt ?? 0).getTime() - new Date(left.story.lastUpdatedAt ?? 0).getTime())
    .map(({ story }) => story);
  return diversifyStories(ranked);
}

export function mergeUniqueStories(existing: ReelStory[], incoming: ReelStory[]) { const incomingById = new Map(incoming.map((story) => [story.id, story])); const merged = existing.map((story) => ({ ...story, ...(incomingById.get(story.id) ?? {}) })); const existingIds = new Set(existing.map((story) => story.id)); return [...merged, ...incoming.filter((story) => !existingIds.has(story.id))]; }

export { isMeaningfulImpact };
