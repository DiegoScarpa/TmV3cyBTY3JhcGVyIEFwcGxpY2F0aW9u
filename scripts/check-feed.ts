import "dotenv/config";
import { INITIAL_SOURCES } from "@/src/lib/news/sources";
import { fetchFeed } from "@/src/lib/news/rss";
import { sortStoriesForFeed } from "@/src/lib/news/feed";

const source = INITIAL_SOURCES[0];
fetchFeed(source.rssUrl).then((items) => {
  const latest = sortStoriesForFeed(items.map((item) => ({ ...item, latestPublishedAt: item.publishedAt, lastUpdatedAt: item.publishedAt })), "latest")[0];
  console.log(`${source.name}: ${items.length} items`);
  console.log(`[FRESHNESS] Latest feed candidate: ${latest?.title ?? "none"}`);
  console.log(`[FRESHNESS] Published: ${latest?.publishedAt?.toISOString() ?? "unknown"}`);
  console.log(items.slice(0, 3));
}).catch((error) => { console.error(`${source.name}: ${error instanceof Error ? error.message : error}`); process.exitCode = 1; });
