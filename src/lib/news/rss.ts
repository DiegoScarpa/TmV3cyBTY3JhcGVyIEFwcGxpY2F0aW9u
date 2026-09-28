import Parser from "rss-parser";
import { canonicalizeUrl, normalizeWhitespace, stripHtml } from "@/src/lib/utils";

export type FeedItem = {
  title: string;
  originalUrl: string;
  canonicalUrl: string;
  author?: string;
  publishedAt?: Date;
  description?: string;
  imageUrl?: string;
};

const parser = new Parser<Record<string, never>, { [key: string]: string }>({ timeout: 15000, headers: { "user-agent": "NewsIntelligence/1.0 RSS reader" } });

/** Parse RSS dates without ever falling back to the server's local timezone. */
export function parsePublishedDate(value: unknown): Date | undefined {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value;
  if (typeof value === "number" && Number.isFinite(value)) {
    const timestamp = value < 10_000_000_000 ? value * 1000 : value;
    const date = new Date(timestamp);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }
  if (typeof value !== "string" || !value.trim()) return undefined;
  const raw = value.trim();
  const hasTimezone = /(Z|[+-]\d{2}:?\d{2}|\b(?:GMT|UTC)\b)$/i.test(raw);
  const normalized = hasTimezone ? raw : `${raw}${/^\d{4}-\d{2}-\d{2}$/.test(raw) ? "T00:00:00" : ""}Z`;
  const timestamp = Date.parse(normalized);
  if (Number.isNaN(timestamp)) return undefined;
  return new Date(timestamp);
}

export async function fetchFeed(rssUrl: string): Promise<FeedItem[]> {
  const feed = await parser.parseURL(rssUrl);
  return (feed.items ?? []).flatMap((item) => {
    const originalUrl = item.link?.trim();
    const title = item.title ? normalizeWhitespace(stripHtml(item.title)) : "";
    if (!originalUrl || !title) return [];
    const imageUrl = item.enclosure?.url;
    const rawPublishedAt = item.isoDate || item.pubDate || item["dc:date"];
    const publishedAt = parsePublishedDate(rawPublishedAt);
    return [{
      title,
      originalUrl,
      canonicalUrl: canonicalizeUrl(originalUrl),
      author: item.creator || item.author,
      publishedAt,
      description: item.contentSnippet || item.content ? normalizeWhitespace(stripHtml(item.contentSnippet || item.content || "")) : undefined,
      imageUrl,
    }];
  });
}
