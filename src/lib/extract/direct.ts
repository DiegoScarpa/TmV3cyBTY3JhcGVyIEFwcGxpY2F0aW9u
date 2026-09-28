import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import * as cheerio from "cheerio";
import { normalizeWhitespace } from "@/src/lib/utils";

export type ExtractedArticle = {
  title?: string;
  author?: string;
  publishedAt?: Date;
  description?: string;
  content?: string;
  imageUrl?: string;
  canonicalUrl?: string;
};

const lastRequestByHost = new Map<string, number>();

async function waitForHost(url: string) {
  const host = new URL(url).hostname;
  const previous = lastRequestByHost.get(host) ?? 0;
  const delay = 700 - (Date.now() - previous);
  if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
  lastRequestByHost.set(host, Date.now());
}

function parseDate(value?: string | null) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function isSufficientContent(content?: string) {
  if (!content) return false;
  const normalized = normalizeWhitespace(content);
  return normalized.length >= 400 && !/enable javascript|access denied|captcha|subscribe to continue/i.test(normalized.slice(0, 1200));
}

export async function extractDirect(url: string): Promise<ExtractedArticle> {
  await waitForHost(url);
  const response = await fetch(url, { headers: { "user-agent": "NewsIntelligence/1.0 (respectful reader)", accept: "text/html,application/xhtml+xml" }, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Direct fetch failed with ${response.status}`);
  const html = (await response.text()).slice(0, 3_000_000);
  const $ = cheerio.load(html);
  const meta = (name: string) => $(`meta[property="${name}"], meta[name="${name}"]`).first().attr("content")?.trim();
  const dom = new JSDOM(html, { url });
  const parsed = new Readability(dom.window.document).parse();
  const content = parsed?.textContent ? normalizeWhitespace(parsed.textContent) : undefined;
  const canonicalUrl = $("link[rel='canonical']").attr("href") || meta("og:url") || url;
  return {
    title: parsed?.title || meta("og:title") || undefined,
    author: parsed?.byline || meta("author") || meta("article:author") || undefined,
    publishedAt: parseDate(meta("article:published_time") || $("time[datetime]").first().attr("datetime")),
    description: parsed?.excerpt || meta("description") || meta("og:description") || undefined,
    content,
    imageUrl: meta("og:image") || undefined,
    canonicalUrl,
  };
}
