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

export async function fetchFeed(rssUrl: string): Promise<FeedItem[]> {
  const feed = await parser.parseURL(rssUrl);
  return (feed.items ?? []).flatMap((item) => {
    const originalUrl = item.link?.trim();
    const title = item.title ? normalizeWhitespace(stripHtml(item.title)) : "";
    if (!originalUrl || !title) return [];
    const imageUrl = item.enclosure?.url;
    const publishedAt = item.isoDate || item.pubDate ? new Date(item.isoDate || item.pubDate || "") : undefined;
    return [{
      title,
      originalUrl,
      canonicalUrl: canonicalizeUrl(originalUrl),
      author: item.creator || item.author,
      publishedAt: publishedAt && !Number.isNaN(publishedAt.getTime()) ? publishedAt : undefined,
      description: item.contentSnippet || item.content ? normalizeWhitespace(stripHtml(item.contentSnippet || item.content || "")) : undefined,
      imageUrl,
    }];
  });
}
