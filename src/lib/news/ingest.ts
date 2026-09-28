import crypto from "node:crypto";
import { db } from "@/src/lib/db";
import { extractArticle } from "@/src/lib/extract";
import { summarizeStory } from "@/src/lib/ai";
import { calculateImportance, calculateRelevance } from "./importance";
import { classifyLocally } from "./classify";
import { shouldJoinStory } from "./dedupe";
import { fetchFeed, type FeedItem } from "./rss";
import { canonicalizeUrl, hashContent, normalizeWhitespace } from "@/src/lib/utils";

type IngestOptions = { sourceIds?: string[]; limitPerSource?: number; trigger?: string };
type ProcessedItem = { created: boolean; storyCreated: boolean; storyId?: string };
export type IngestResult = { skipped: boolean; status: string; runId?: string; articlesDiscovered: number; articlesProcessed: number; storiesCreated: number; storiesUpdated: number; errors: string[] };

const INGESTION_LOCK_NAME = "hourly-news-ingestion";
const LOCK_TTL_MS = 2 * 60 * 60 * 1000;

function json(value: unknown) { return value as object; }

async function acquireIngestionLock() {
  const lockedBy = crypto.randomUUID();
  const now = new Date();
  const expires = new Date(now.getTime() + LOCK_TTL_MS);
  try {
    await db.ingestionLock.create({ data: { name: INGESTION_LOCK_NAME, lockedBy, lockedAt: now, lockExpiresAt: expires } });
  } catch {
    const updated = await db.ingestionLock.updateMany({
      where: { name: INGESTION_LOCK_NAME, OR: [{ lockExpiresAt: null }, { lockExpiresAt: { lt: now } }] },
      data: { lockedBy, lockedAt: now, lockExpiresAt: expires },
    });
    if (updated.count === 0) return null;
  }
  return lockedBy;
}

async function releaseIngestionLock(lockedBy: string) {
  await db.ingestionLock.updateMany({ where: { name: INGESTION_LOCK_NAME, lockedBy }, data: { lockedBy: null, lockedAt: null, lockExpiresAt: null } });
}

async function chooseCategory(sourceCategoryId: string, title: string, description: string | undefined) {
  const sourceCategory = await db.category.findUnique({ where: { id: sourceCategoryId } });
  const local = classifyLocally(title, description, sourceCategory?.name ?? "World");
  const classifiedCategory = await db.category.findUnique({ where: { slug: local.toLowerCase().replace(/[^a-z0-9]+/g, "-") } });
  return classifiedCategory ?? sourceCategory;
}

async function makeStory(title: string, categoryId: string, coverageAt: Date) {
  return db.story.create({ data: { headline: title, primaryCategoryId: categoryId, keyFacts: [], entities: [], topics: [], comparison: [], firstReportedAt: coverageAt, latestPublishedAt: coverageAt, lastUpdatedAt: new Date(), importanceScore: 0.25, relevanceScore: 0.5 } });
}

async function attachArticleToStory(storyId: string, article: { id: string; publishedAt: Date | null; discoveredAt: Date }, sourceId: string) {
  await db.article.update({ where: { id: article.id }, data: { storyId, processingStatus: "CLUSTERED" } });
  await db.storySource.upsert({ where: { storyId_articleId: { storyId, articleId: article.id } }, update: {}, create: { storyId, articleId: article.id, sourceId } });
  const publishedAt = article.publishedAt ?? article.discoveredAt;
  const existing = await db.story.findUnique({ where: { id: storyId }, select: { latestPublishedAt: true } });
  await db.story.update({
    where: { id: storyId },
    data: {
      lastUpdatedAt: article.discoveredAt,
      ...(publishedAt && (!existing?.latestPublishedAt || publishedAt > existing.latestPublishedAt) ? { latestPublishedAt: publishedAt } : {}),
    },
  });
}

export async function refreshStory(storyId: string, forceUpdate = false) {
  const story = await db.story.findUnique({ where: { id: storyId }, include: { articles: { include: { source: true } }, primaryCategory: true } });
  if (!story || story.articles.length === 0) return false;
  const latestArticleAt = story.articles.reduce((latest, article) => Math.max(latest, (article.publishedAt ?? article.discoveredAt).getTime()), 0);
  const needsUpdate = forceUpdate || !story.summary || latestArticleAt > (story.latestPublishedAt?.getTime() ?? 0);
  if (!needsUpdate) return false;

  const sources = story.articles.map((article) => `SOURCE: ${article.source.name}\nURL: ${article.originalUrl}\nDATE: ${article.publishedAt?.toISOString() ?? "unknown"}\nHEADLINE: ${article.title}\nDESCRIPTION: ${article.description ?? ""}\nCONTENT: ${(article.content ?? article.description ?? "").slice(0, 9000)}`).join("\n\n---\n\n");
  const shouldUseAI = Boolean(process.env.OPENAI_API_KEY);
  const job = shouldUseAI ? await db.processingJob.create({ data: { type: "SUMMARY", status: "RUNNING", storyId, attempts: 1, payload: { articleCount: story.articles.length }, startedAt: new Date() } }) : null;
  try {
    const ai = shouldUseAI ? await summarizeStory(`CATEGORY: ${story.primaryCategory.name}\n\n${sources}`) : null;
    if (ai) {
      await db.story.update({ where: { id: storyId }, data: { headline: ai.headline, summary: ai.summary, whyItMatters: ai.whyItMatters, keyFacts: json(ai.keyFacts), whatHappensNext: ai.whatHappensNext, confidence: ai.confidence, entities: json(ai.entities), topics: json(ai.topics), comparison: json(ai.comparison), lastUpdatedAt: new Date() } });
    } else if (!story.summary) {
      await db.story.update({ where: { id: storyId }, data: { summary: story.articles[0].description ?? "A source has reported this development. Full AI synthesis is pending configuration.", confidence: "Reported", lastUpdatedAt: new Date() } });
    } else if (!shouldUseAI) {
      await db.story.update({ where: { id: storyId }, data: { lastUpdatedAt: new Date() } });
    }
    const preference = await db.userPreference.findFirst();
    const relevance = calculateRelevance(`${story.headline} ${story.summary ?? ""}`, (preference ?? {}) as { topics?: string[]; companies?: string[]; people?: string[]; keywords?: string[] });
    const importance = calculateImportance({ publishedAt: story.lastUpdatedAt, sourceCount: new Set(story.articles.map((article) => article.sourceId)).size, reliability: story.articles.reduce((sum, article) => sum + article.source.reliability, 0) / story.articles.length, relevance, developing: story.articles.length < 2 });
    await db.story.update({ where: { id: storyId }, data: { relevanceScore: relevance, importanceScore: importance } });
    await db.article.updateMany({ where: { storyId }, data: { processingStatus: ai ? "SUMMARIZED" : "CLUSTERED" } });
    if (job) await db.processingJob.update({ where: { id: job.id }, data: { status: "COMPLETED", completedAt: new Date() } });
    return true;
  } catch (error) {
    if (job) await db.processingJob.update({ where: { id: job.id }, data: { status: "FAILED", error: error instanceof Error ? error.message : "Unknown AI error", completedAt: new Date() } });
    console.error(`[ingestion] story ${storyId} refresh failed`, error);
    return false;
  }
}

async function processItem(source: { id: string; categoryId: string }, item: FeedItem, discoveredAt: Date): Promise<ProcessedItem> {
  const canonicalUrl = canonicalizeUrl(item.originalUrl);
  const existing = await db.article.findUnique({ where: { canonicalUrl } });
  if (existing) {
    await db.article.update({ where: { id: existing.id }, data: { lastCheckedAt: discoveredAt } });
    return { created: false, storyCreated: false, storyId: existing.storyId ?? undefined };
  }
  const category = await chooseCategory(source.categoryId, item.title, item.description);
  if (!category) throw new Error("Source category is missing");
  const extracted = await extractArticle(item.originalUrl, { title: item.title, author: item.author, publishedAt: item.publishedAt, description: item.description, imageUrl: item.imageUrl, canonicalUrl: item.canonicalUrl });
  const content = extracted.content ? normalizeWhitespace(extracted.content) : undefined;
  const extractionError = "extractionError" in extracted ? extracted.extractionError : undefined;
  const contentHash = "contentHash" in extracted ? extracted.contentHash : (content ? hashContent(content) : undefined);
  const hashMatch = contentHash ? await db.article.findFirst({ where: { contentHash, NOT: { canonicalUrl } }, select: { storyId: true } }) : null;
  const article = await db.article.create({ data: {
    title: extracted.title ?? item.title, canonicalUrl: canonicalizeUrl(extracted.canonicalUrl ?? canonicalUrl), originalUrl: item.originalUrl,
    sourceId: source.id, author: extracted.author, publishedAt: extracted.publishedAt ?? item.publishedAt, description: extracted.description ?? item.description,
    content, imageUrl: extracted.imageUrl ?? item.imageUrl, extractionMethod: extracted.extractionMethod, contentHash,
    discoveredAt, lastCheckedAt: discoveredAt, language: "en", categoryId: category.id, tags: [], processingStatus: "EXTRACTED", extractionError, metadata: { source: "rss", discoveredAt: discoveredAt.toISOString() },
  } });
  const recentStories = await db.story.findMany({ where: { primaryCategoryId: category.id, lastUpdatedAt: { gte: new Date(Date.now() - 30 * 86_400_000) } }, include: { articles: true }, orderBy: { lastUpdatedAt: "desc" }, take: 100 });
  const hashStory = hashMatch?.storyId ? recentStories.find((story) => story.id === hashMatch.storyId) : null;
  const match = hashStory ?? recentStories.find((story) => shouldJoinStory(story.headline, article.title, Math.abs(Date.now() - story.lastUpdatedAt.getTime()) / 86_400_000));
  const coverageAt = article.publishedAt ?? discoveredAt;
  const story = match ?? await makeStory(article.title, category.id, coverageAt);
  await attachArticleToStory(story.id, article, source.id);
  return { created: true, storyCreated: !match, storyId: story.id };
}

async function runIngestion(options: IngestOptions): Promise<IngestResult> {
  const run = await db.ingestionRun.create({ data: { errors: [] } });
  const sources = await db.source.findMany({ where: { enabled: true, ...(options.sourceIds?.length ? { id: { in: options.sourceIds } } : {}) }, orderBy: { name: "asc" } });
  let articlesDiscovered = 0, articlesProcessed = 0, storiesCreated = 0, storiesUpdated = 0;
  const errors: string[] = [];
  const storyIdsToRefresh = new Set<string>();
  for (const source of sources) {
    const fetchStartedAt = new Date();
    console.info(`[NEWS] Fetch started: ${source.name}`);
    await db.source.update({ where: { id: source.id }, data: { lastFetchedAt: fetchStartedAt } });
    try {
      const fetchedItems = await fetchFeed(source.rssUrl);
      const items = fetchedItems.slice(0, options.limitPerSource ?? 20);
      articlesDiscovered += fetchedItems.length;
      const newestPublishedAt = fetchedItems.reduce<Date | null>((newest, item) => item.publishedAt && (!newest || item.publishedAt > newest) ? item.publishedAt : newest, null);
      await db.source.update({ where: { id: source.id }, data: { lastFetchedAt: fetchStartedAt, lastSuccessAt: new Date(), lastError: null, failureCount: 0, articlesFound: fetchedItems.length, newestArticleDiscoveredAt: fetchedItems.length ? new Date() : null, newestArticlePublishedAt: newestPublishedAt } });
      console.info(`[NEWS] Source: ${source.name}`);
      console.info(`[NEWS] Articles discovered: ${fetchedItems.length}`);
      console.info(`[NEWS] Newest publication: ${newestPublishedAt?.toISOString() ?? "unknown"}`);
      for (const item of items) {
        try {
          const result = await processItem(source, item, new Date());
          if (result.created) { articlesProcessed++; if (result.storyCreated) storiesCreated++; else storiesUpdated++; }
          if (result.storyId && result.created) storyIdsToRefresh.add(result.storyId);
        } catch (error) { errors.push(`${source.name}: ${error instanceof Error ? error.message : "article failed"}`); }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "feed failed";
      errors.push(`${source.name}: ${message}`);
      console.error(`[NEWS] Source failed: ${source.name}`, message);
      await db.source.update({ where: { id: source.id }, data: { lastFetchedAt: new Date(), lastError: message, failureCount: { increment: 1 } } });
    }
  }
  for (const storyId of storyIdsToRefresh) await refreshStory(storyId, true);
  const status = errors.length === sources.length && sources.length > 0 ? "FAILED" : "COMPLETED";
  console.info(`[NEWS] New articles: ${articlesProcessed}`);
  console.info(`[NEWS] Stories created: ${storiesCreated}`);
  console.info(`[NEWS] Stories updated: ${storiesUpdated}`);
  await db.ingestionRun.update({ where: { id: run.id }, data: { status, completedAt: new Date(), articlesDiscovered, articlesProcessed, storiesCreated, storiesUpdated, errors } });
  console.info(`[NEWS] Ingestion completed: ${status}`);
  return { skipped: false, status, runId: run.id, articlesDiscovered, articlesProcessed, storiesCreated, storiesUpdated, errors };
}

export async function ingestNews(options: IngestOptions = {}): Promise<IngestResult> {
  const lockedBy = await acquireIngestionLock();
  if (!lockedBy) return { skipped: true, status: "SKIPPED_LOCKED", articlesDiscovered: 0, articlesProcessed: 0, storiesCreated: 0, storiesUpdated: 0, errors: ["Another ingestion run is already active."] };
  try { return await runIngestion(options); } finally { await releaseIngestionLock(lockedBy); }
}
