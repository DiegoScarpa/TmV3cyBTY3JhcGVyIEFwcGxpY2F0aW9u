import "dotenv/config";
import { INITIAL_SOURCES } from "@/src/lib/news/sources";
import { fetchFeed } from "@/src/lib/news/rss";

const source = INITIAL_SOURCES[0];
fetchFeed(source.rssUrl).then((items) => { console.log(`${source.name}: ${items.length} items`); console.log(items.slice(0, 3)); }).catch((error) => { console.error(`${source.name}: ${error instanceof Error ? error.message : error}`); process.exitCode = 1; });
