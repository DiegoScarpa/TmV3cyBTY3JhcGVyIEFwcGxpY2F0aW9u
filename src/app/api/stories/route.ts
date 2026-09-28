import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";
import { getFreshnessWindowStart, type FeedMode, type FreshnessWindow } from "@/src/lib/news/feed";
import { noStoreHeaders } from "@/src/lib/news/cache";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function isMode(value: string | null): value is FeedMode { return value === "latest" || value === "top"; }
function isWindow(value: string | null): value is FreshnessWindow { return value === "1h" || value === "6h" || value === "24h" || value === "3d" || value === "7d" || value === "all"; }

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = isMode(url.searchParams.get("mode")) ? url.searchParams.get("mode") as FeedMode : "latest";
  const window = isWindow(url.searchParams.get("window")) ? url.searchParams.get("window") as FreshnessWindow : "24h";
  const category = url.searchParams.get("category");
  const start = getFreshnessWindowStart(window);
  const timeFilter = start ? { OR: [{ latestPublishedAt: { gte: start } }, { latestPublishedAt: null, lastUpdatedAt: { gte: start } }] } : {};
  const stories = await db.story.findMany({
    where: { ...(category ? { primaryCategory: { slug: category } } : {}), ...timeFilter },
    take: 50,
    orderBy: mode === "latest" ? [{ latestPublishedAt: "desc" }, { lastUpdatedAt: "desc" }] : [{ importanceScore: "desc" }, { relevanceScore: "desc" }, { lastUpdatedAt: "desc" }],
    include: { primaryCategory: true, analysis: true, storySources: { include: { source: true, article: true } } },
  });
  return NextResponse.json(stories, { headers: noStoreHeaders });
}
