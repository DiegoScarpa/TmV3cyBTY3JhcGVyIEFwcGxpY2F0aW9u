import { describe, expect, it } from "vitest";
import { areDuplicateArticles, shouldJoinStory } from "@/src/lib/news/dedupe";
import { classifyLocally } from "@/src/lib/news/classify";
import { calculateImportance } from "@/src/lib/news/importance";
import { buildSmryReaderUrl } from "@/src/lib/extract/smry";
import { isSufficientContent } from "@/src/lib/extract/direct";
import { canonicalizeUrl, hashContent } from "@/src/lib/utils";
import { getIngestionIntervalMinutes } from "@/src/lib/jobs/config";

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
