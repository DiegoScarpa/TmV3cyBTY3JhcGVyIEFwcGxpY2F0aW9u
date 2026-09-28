import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";
import { noStoreHeaders } from "@/src/lib/news/cache";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const [sources, articles, stories, pending, lastRun, lastSuccessfulRun, currentRun, recentRuns] = await Promise.all([
    db.source.findMany({ select: { id: true, name: true, lastError: true, lastFetchedAt: true, lastSuccessAt: true, articlesFound: true, newestArticleDiscoveredAt: true, newestArticlePublishedAt: true, articles: { take: 1, orderBy: { discoveredAt: "desc" }, select: { title: true, discoveredAt: true, publishedAt: true } } } }),
    db.article.count(), db.story.count(), db.processingJob.count({ where: { status: "PENDING" } }),
    db.ingestionRun.findFirst({ orderBy: { startedAt: "desc" } }),
    db.ingestionRun.findFirst({ where: { status: "COMPLETED" }, orderBy: { completedAt: "desc" } }),
    db.ingestionRun.findFirst({ where: { status: "RUNNING" }, orderBy: { startedAt: "desc" } }),
    db.ingestionRun.findMany({ take: 10, orderBy: { startedAt: "desc" }, select: { id: true, startedAt: true, completedAt: true, status: true, errors: true, articlesDiscovered: true, articlesProcessed: true, storiesCreated: true, storiesUpdated: true } }),
  ]);
  const recentErrors = recentRuns.flatMap((run) => Array.isArray(run.errors) ? run.errors.map((error) => ({ runId: run.id, startedAt: run.startedAt, message: String(error) })) : []);
  const sourceMetrics = sources.map((source) => {
    const stale = source.newestArticlePublishedAt && Date.now() - source.newestArticlePublishedAt.getTime() > 6 * 60 * 60 * 1000;
    return { ...source, newestArticle: source.articles[0] ?? null, articles: undefined, fetchStatus: source.lastError ? "FAILED" : source.lastSuccessAt ? (stale ? "STALE" : "OK") : "NEVER_RUN" };
  });
  return NextResponse.json({ sources: sourceMetrics, articles, stories, pending, lastRun, lastSuccessfulRun, currentRun, recentRuns, recentErrors }, { headers: noStoreHeaders });
}
