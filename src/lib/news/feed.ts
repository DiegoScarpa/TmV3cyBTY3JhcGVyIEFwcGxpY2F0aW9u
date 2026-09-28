export type FeedMode = "latest" | "top";
export type FreshnessWindow = "1h" | "6h" | "24h" | "3d" | "7d" | "all";

const WINDOW_MS: Record<Exclude<FreshnessWindow, "all">, number> = {
  "1h": 60 * 60 * 1000,
  "6h": 6 * 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "3d": 3 * 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
};

export const freshnessWindows: { value: FreshnessWindow; label: string }[] = [
  { value: "1h", label: "Last hour" },
  { value: "6h", label: "Last 6 hours" },
  { value: "24h", label: "Last 24 hours" },
  { value: "3d", label: "Last 3 days" },
  { value: "7d", label: "Last 7 days" },
  { value: "all", label: "All available" },
];

export function getFreshnessWindowStart(window: FreshnessWindow, now = Date.now()) {
  return window === "all" ? undefined : new Date(now - WINDOW_MS[window]);
}

export type FeedStory = {
  latestPublishedAt?: Date | string | null;
  lastUpdatedAt?: Date | string | null;
  firstReportedAt?: Date | string | null;
  importanceScore?: number | null;
  relevanceScore?: number | null;
};

export function getStoryFeedTimestamp(story: FeedStory) {
  const value = story.latestPublishedAt ?? story.lastUpdatedAt ?? story.firstReportedAt;
  return value ? new Date(value).getTime() : 0;
}

export function sortStoriesForFeed<T extends FeedStory>(stories: T[], mode: FeedMode) {
  return [...stories].sort((left, right) => {
    if (mode === "latest") {
      return getStoryFeedTimestamp(right) - getStoryFeedTimestamp(left);
    }
    return (right.importanceScore ?? 0) - (left.importanceScore ?? 0)
      || (right.relevanceScore ?? 0) - (left.relevanceScore ?? 0)
      || getStoryFeedTimestamp(right) - getStoryFeedTimestamp(left);
  });
}

