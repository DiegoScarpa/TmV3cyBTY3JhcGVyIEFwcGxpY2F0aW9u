import { describe, expect, it } from "vitest";
import { getNewsReelDurationSeconds, mergeUniqueStories, rankReelStories, type ReelPreferences, type ReelStory } from "@/src/lib/news/reel";

const preferences: ReelPreferences = { topics: ["AI"], countries: [], companies: [], people: [], keywords: ["semiconductors"], hiddenTopics: ["Sports"] };

function story(id: string, overrides: Partial<ReelStory> = {}): ReelStory {
  return { id, headline: id, summary: null, whyItMatters: null, category: "AI", categorySlug: "ai", latestPublishedAt: "2026-09-28T12:00:00.000Z", lastUpdatedAt: "2026-09-28T12:00:00.000Z", firstReportedAt: null, sourceNames: ["Source"], sourceUrl: null, imageUrl: null, topics: [], entities: [], importanceScore: 0, relevanceScore: 0, confidence: "Reported", keyFacts: [], analysis: null, ...overrides };
}

describe("news reel", () => {
  it("defaults to twenty seconds and accepts a configurable duration", () => {
    expect(getNewsReelDurationSeconds(undefined)).toBe(20);
    expect(getNewsReelDurationSeconds("15")).toBe(15);
    expect(getNewsReelDurationSeconds("invalid")).toBe(20);
  });

  it("prioritizes recent stories for All News while filtering topics", () => {
    const newer = story("newer", { latestPublishedAt: "2026-09-28T12:00:00.000Z" });
    const older = story("older", { latestPublishedAt: "2026-09-27T12:00:00.000Z", lastUpdatedAt: "2026-09-27T12:00:00.000Z", importanceScore: 1 });
    const sports = story("sports", { category: "Sports", categorySlug: "sports" });
    expect(rankReelStories([older, sports, newer], "ai", preferences, Date.parse("2026-09-28T13:00:00.000Z")).map((item) => item.id)).toEqual(["newer", "older"]);
  });

  it("gives a meaningful update and explicit interests a place in My Feed", () => {
    const updated = story("updated", { category: "Technology", categorySlug: "technology", headline: "New semiconductor design announced", topics: ["semiconductors"], latestPublishedAt: "2026-09-27T12:00:00.000Z", lastUpdatedAt: "2026-09-28T12:00:00.000Z" });
    const hidden = story("hidden", { category: "Sports", categorySlug: "sports" });
    expect(rankReelStories([hidden, updated], "my-feed", preferences, Date.parse("2026-09-28T13:00:00.000Z")).map((item) => item.id)).toEqual(["updated"]);
  });

  it("updates an existing story without duplicating it", () => {
    const original = story("same", { headline: "Original headline" });
    const update = story("same", { headline: "Updated headline" });
    const merged = mergeUniqueStories([original], [update, story("new")]);
    expect(merged).toHaveLength(2);
    expect(merged[0].headline).toBe("Updated headline");
  });
});
