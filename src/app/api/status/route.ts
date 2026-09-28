import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";

export async function GET() {
  const [sources, articles, stories, pending, lastRun, lastSuccessfulRun, currentRun, recentRuns] = await Promise.all([
    db.source.findMany({ select: { id: true, name: true, lastError: true, lastSuccessAt: true } }),
    db.article.count(), db.story.count(), db.processingJob.count({ where: { status: "PENDING" } }),
    db.ingestionRun.findFirst({ orderBy: { startedAt: "desc" } }),
    db.ingestionRun.findFirst({ where: { status: "COMPLETED" }, orderBy: { completedAt: "desc" } }),
    db.ingestionRun.findFirst({ where: { status: "RUNNING" }, orderBy: { startedAt: "desc" } }),
    db.ingestionRun.findMany({ take: 10, orderBy: { startedAt: "desc" }, select: { id: true, startedAt: true, completedAt: true, status: true, errors: true, articlesDiscovered: true, articlesProcessed: true, storiesCreated: true, storiesUpdated: true } }),
  ]);
  const recentErrors = recentRuns.flatMap((run) => Array.isArray(run.errors) ? run.errors.map((error) => ({ runId: run.id, startedAt: run.startedAt, message: String(error) })) : []);
  return NextResponse.json({ sources, articles, stories, pending, lastRun, lastSuccessfulRun, currentRun, recentRuns, recentErrors });
}
