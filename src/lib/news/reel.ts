export type ReelTopic = "all" | "my-feed" | "ai" | "technology" | "business" | "economy" | "markets" | "world" | "united-states" | "science" | "sports" | "gaming" | "startups" | "cybersecurity" | "space";

export type ReelPreferences = {
  topics: string[];
  countries: string[];
  companies: string[];
  people: string[];
  keywords: string[];
  hiddenTopics: string[];
};

export type ReelStory = {
  id: string;
  headline: string;
  summary: string | null;
  whyItMatters: string | null;
  category: string;
  categorySlug: string;
  latestPublishedAt: string | null;
  lastUpdatedAt: string | null;
  firstReportedAt: string | null;
  sourceNames: string[];
  sourceUrl: string | null;
  imageUrl: string | null;
  topics: string[];
  entities: string[];
  importanceScore: number;
  relevanceScore: number;
};

export type ReelStoryRecord = {
  id: string;
  headline: string;
  summary: string | null;
  whyItMatters: string | null;
  primaryCategory: { name: string; slug: string };
  latestPublishedAt: Date | string | null;
  lastUpdatedAt: Date | string | null;
  firstReportedAt: Date | string | null;
  importanceScore: number;
  relevanceScore: number;
  topics: unknown;
  entities: unknown;
  storySources: Array<{
    source: { name: string };
    article: {
      originalUrl: string;
      imageUrl: string | null;
      publishedAt: Date | string | null;
      discoveredAt: Date | string | null;
    };
  }>;
};

export const reelTopicOptions: Array<{ value: ReelTopic; label: string }> = [
  { value: "all", label: "All News" },
  { value: "my-feed", label: "My Feed" },
  { value: "ai", label: "AI" },
  { value: "technology", label: "Technology" },
  { value: "business", label: "Business" },
  { value: "economy", label: "Economy" },
  { value: "markets", label: "Markets" },
  { value: "world", label: "World" },
  { value: "united-states", label: "United States" },
  { value: "science", label: "Science" },
  { value: "sports", label: "Sports" },
  { value: "gaming", label: "Gaming" },
  { value: "startups", label: "Startups" },
  { value: "cybersecurity", label: "Cybersecurity" },
  { value: "space", label: "Space" },
];

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function toIso(value: Date | string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function toReelStory(story: ReelStoryRecord): ReelStory {
  const sources = [...story.storySources].sort((left, right) => {
    const leftDate = new Date(left.article.publishedAt ?? left.article.discoveredAt ?? 0).getTime();
    const rightDate = new Date(right.article.publishedAt ?? right.article.discoveredAt ?? 0).getTime();
    return rightDate - leftDate;
  });
  const imageSource = sources.find((item) => item.article.imageUrl) ?? sources[0];
  return {
    id: story.id,
    headline: story.headline,
    summary: story.summary,
    whyItMatters: story.whyItMatters,
    category: story.primaryCategory.name,
    categorySlug: story.primaryCategory.slug,
    latestPublishedAt: toIso(story.latestPublishedAt),
    lastUpdatedAt: toIso(story.lastUpdatedAt),
    firstReportedAt: toIso(story.firstReportedAt),
    sourceNames: [...new Set(sources.map((item) => item.source.name))],
    sourceUrl: sources[0]?.article.originalUrl ?? null,
    imageUrl: imageSource?.article.imageUrl ?? null,
    topics: asStringArray(story.topics),
    entities: asStringArray(story.entities),
    importanceScore: story.importanceScore,
    relevanceScore: story.relevanceScore,
  };
}

export function getNewsReelDurationSeconds(value = process.env.NEWS_REEL_DURATION_SECONDS) {
  const parsed = Number(value ?? 20);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 3600) : 20;
}

function normalized(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function storySearchText(story: ReelStory) {
  return normalized([story.headline, story.summary ?? "", story.category, ...story.topics, ...story.entities].join(" "));
}

function preferenceMatch(story: ReelStory, preferences: ReelPreferences) {
  const haystack = storySearchText(story);
  const interests = [...preferences.topics, ...preferences.countries, ...preferences.companies, ...preferences.people, ...preferences.keywords]
    .map(normalized)
    .filter(Boolean);
  const paddedHaystack = `-${haystack}-`;
  return interests.length ? interests.filter((interest) => paddedHaystack.includes(`-${interest}-`)).length / interests.length : 0;
}

function matchesTopic(story: ReelStory, topic: ReelTopic) {
  if (topic === "all" || topic === "my-feed") return true;
  if (topic === "markets") return story.categorySlug === "financial-markets" || story.categorySlug.includes("market");
  return story.categorySlug === topic || normalized(story.category) === topic;
}

function isHidden(story: ReelStory, preferences: ReelPreferences) {
  const hidden = preferences.hiddenTopics.map(normalized);
  return hidden.includes(normalized(story.category)) || hidden.includes(story.categorySlug);
}

function timestampFor(story: ReelStory) {
  return new Date(story.latestPublishedAt ?? story.lastUpdatedAt ?? 0).getTime();
}

export function rankReelStories(stories: ReelStory[], topic: ReelTopic, preferences: ReelPreferences, now = Date.now()) {
  return stories
    .filter((story) => matchesTopic(story, topic) && (topic !== "my-feed" || !isHidden(story, preferences)))
    .map((story) => {
      const publishedAt = timestampFor(story);
      const ageHours = Math.max(0, (now - publishedAt) / 3_600_000);
      const recency = Math.exp(-ageHours / 72);
      const published = story.latestPublishedAt ? new Date(story.latestPublishedAt).getTime() : 0;
      const updated = story.lastUpdatedAt ? new Date(story.lastUpdatedAt).getTime() : 0;
      const meaningfulUpdate = updated > published + 60_000 ? 1 : 0;
      const relevance = topic === "my-feed" ? preferenceMatch(story, preferences) : story.relevanceScore;
      const score = recency * 0.65 + meaningfulUpdate * 0.2 + Math.min(1, story.importanceScore) * 0.1 + Math.min(1, relevance) * 0.05;
      return { story, score };
    })
    .sort((left, right) => right.score - left.score || timestampFor(right.story) - timestampFor(left.story) || new Date(right.story.lastUpdatedAt ?? 0).getTime() - new Date(left.story.lastUpdatedAt ?? 0).getTime())
    .map(({ story }) => story);
}

export function mergeUniqueStories(existing: ReelStory[], incoming: ReelStory[]) {
  const incomingById = new Map(incoming.map((story) => [story.id, story]));
  const merged = existing.map((story) => ({ ...story, ...(incomingById.get(story.id) ?? {}) }));
  const existingIds = new Set(existing.map((story) => story.id));
  return [...merged, ...incoming.filter((story) => !existingIds.has(story.id))];
}
