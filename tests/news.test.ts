import { describe, expect, it } from "vitest";
import { areDuplicateArticles, shouldJoinStory } from "@/src/lib/news/dedupe";
import { classifyLocally } from "@/src/lib/news/classify";
import { calculateImportance } from "@/src/lib/news/importance";
import { buildSmryReaderUrl } from "@/src/lib/extract/smry";
import { isSufficientContent } from "@/src/lib/extract/direct";
import { canonicalizeUrl, hashContent } from "@/src/lib/utils";
import { getIngestionIntervalMinutes } from "@/src/lib/jobs/config";
import { parsePublishedDate } from "@/src/lib/news/rss";
import { getFreshnessWindowStart, sortStoriesForFeed } from "@/src/lib/news/feed";
import { noStoreHeaders } from "@/src/lib/news/cache";
import { getImpactMinConfidence, isMeaningfulImpact, limitAnalysisSources, EMPTY_ANALYSIS } from "@/src/lib/analysis";
import { extractLocalTopics } from "@/src/lib/news/classify";

describe("URL normalization", () => {
  it("removes tracking parameters and hashes", () => expect(canonicalizeUrl("https://Example.com/story/?utm_source=rss&x=1#comments")).toBe("https://example.com/story?x=1"));
});
describe("duplicate detection", () => {
  it("detects same event headlines", () => expect(areDuplicateArticles({ title: "Fed keeps interest rates unchanged", canonicalUrl: "https://a.test/1" }, { title: "Federal Reserve keeps interest rates unchanged", canonicalUrl: "https://b.test/2" })).toBe(true));
  it("detects identical content hashes", () => expect(areDuplicateArticles({ title: "A", canonicalUrl: "https://a.test", contentHash: hashContent("same") }, { title: "B", canonicalUrl: "https://b.test", contentHash: hashContent("same") })).toBe(true));
  it("clusters related stories", () => expect(shouldJoinStory("Federal Reserve holds interest rates steady", "Fed leaves rates unchanged", 1)).toBe(true));
});
describe("classification and ranking", () => {
  it("classifies clear AI stories", () => expect(classifyLocally("OpenAI releases a new artificial intelligence model", "The model improves machine learning performance")).toBe("AI"));
  it("returns a normalized importance score", () => expect(calculateImportance({ publishedAt: new Date(), sourceCount: 4, reliability: 0.9, relevance: 1, majorChange: true })).toBeGreaterThan(0.7));
});
describe("extraction fallbacks", () => {
  it("builds the public SMRY reader URL", () => expect(buildSmryReaderUrl("https://example.com/a")).toBe("https://smry.ai/example.com/a"));
  it("requires substantive content", () => expect(isSufficientContent("short".repeat(10))).toBe(false));
});
describe("scheduler configuration", () => {
  it("defaults to hourly", () => { const previous = process.env.NEWS_INGEST_INTERVAL_MINUTES; delete process.env.NEWS_INGEST_INTERVAL_MINUTES; expect(getIngestionIntervalMinutes()).toBe(60); if (previous) process.env.NEWS_INGEST_INTERVAL_MINUTES = previous; });
  it("accepts a positive configured interval", () => { const previous = process.env.NEWS_INGEST_INTERVAL_MINUTES; process.env.NEWS_INGEST_INTERVAL_MINUTES = "15"; expect(getIngestionIntervalMinutes()).toBe(15); if (previous) process.env.NEWS_INGEST_INTERVAL_MINUTES = previous; else delete process.env.NEWS_INGEST_INTERVAL_MINUTES; });
});
describe("freshness pipeline", () => {
  it("parses RSS timezone offsets into UTC", () => {
    expect(parsePublishedDate("Mon, 28 Sep 2026 10:00:00 -0600")?.toISOString()).toBe("2026-09-28T16:00:00.000Z");
    expect(parsePublishedDate("2026-09-28T10:00:00Z")?.toISOString()).toBe("2026-09-28T10:00:00.000Z");
  });
  it("puts a newer published article before an older article in Latest", () => {
    const older = { id: "old", latestPublishedAt: "2026-09-27T12:00:00Z", lastUpdatedAt: "2026-09-27T12:00:00Z", importanceScore: 1 };
    const newer = { id: "new", latestPublishedAt: "2026-09-28T12:00:00Z", lastUpdatedAt: "2026-09-28T12:00:00Z", importanceScore: 0.1 };
    expect(sortStoriesForFeed([older, newer], "latest").map((story) => story.id)).toEqual(["new", "old"]);
  });
  it("moves an existing story upward when new coverage updates it", () => {
    const oldStory = { id: "old", latestPublishedAt: "2026-09-27T12:00:00Z", lastUpdatedAt: "2026-09-27T12:00:00Z" };
    const updatedStory = { id: "updated", latestPublishedAt: "2026-09-28T12:00:00Z", lastUpdatedAt: "2026-09-28T12:30:00Z" };
    expect(sortStoriesForFeed([oldStory, updatedStory], "latest")[0].id).toBe("updated");
  });
  it("keeps Top Stories ranking separate from Latest", () => {
    const newest = { id: "newest", latestPublishedAt: "2026-09-28T12:00:00Z", importanceScore: 0.2, relevanceScore: 0.2 };
    const important = { id: "important", latestPublishedAt: "2026-09-27T12:00:00Z", importanceScore: 0.95, relevanceScore: 0.9 };
    expect(sortStoriesForFeed([important, newest], "latest")[0].id).toBe("newest");
    expect(sortStoriesForFeed([important, newest], "top")[0].id).toBe("important");
  });
  it("supports the default 24-hour freshness window", () => {
    expect(getFreshnessWindowStart("24h", Date.parse("2026-09-28T12:00:00Z"))?.toISOString()).toBe("2026-09-27T12:00:00.000Z");
  });
  it("marks feed responses as uncacheable", () => {
    expect(noStoreHeaders["Cache-Control"]).toContain("no-store");
  });
});
describe("business intelligence analysis", () => {
  it("classifies business subtopics locally", () => expect(extractLocalTopics("Federal Reserve keeps interest rates high for banks and housing", "Mortgage rates and Treasury yields remain in focus")).toEqual(expect.arrayContaining(["Interest Rates", "Federal Reserve", "Banking", "Housing", "Mortgage Rates", "Treasury"])));
  it("keeps analysis source references grounded in supplied sources", () => {
    const analysis = { ...EMPTY_ANALYSIS, directImpact: { relevant: true, confidence: "High" as const, confidenceScore: 0.9, evidence: [{ sourceRef: "Reuters", passage: "A source passage", relationship: "Supports the effect" }, { sourceRef: "Invented Source", passage: "Fake passage", relationship: "Unsupported" }], items: [{ subject: "A", effect: "effect", mechanism: "mechanism", confidence: "High" as const, sourceRefs: ["Reuters", "Invented Source"], direction: "unclear" }] } };
    const limited = limitAnalysisSources(analysis, ["Reuters"]);
    expect(limited.directImpact?.items[0].sourceRefs).toEqual(["Reuters"]);
    expect(limited.directImpact?.evidence).toHaveLength(1);
  });
  it("omits an impact section without evidence or above-threshold confidence", () => {
    expect(isMeaningfulImpact({ relevant: true, confidence: "High", confidenceScore: 0.9, evidence: [], items: [] })).toBe(false);
    expect(isMeaningfulImpact({ relevant: true, confidence: "Low", confidenceScore: 0.5, evidence: [{ sourceRef: "Reuters", passage: "Evidence", relationship: "Relationship" }], items: [{ subject: "A", effect: "effect", mechanism: "mechanism", confidence: "Low", sourceRefs: ["Reuters"] }] })).toBe(false);
    expect(getImpactMinConfidence("0.8")).toBe(0.8);
  });
});
