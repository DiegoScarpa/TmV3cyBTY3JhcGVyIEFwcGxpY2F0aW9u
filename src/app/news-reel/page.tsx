import { db } from "@/src/lib/db";
import { NewsReel } from "@/src/components/news-reel";
import { getFreshnessWindowStart } from "@/src/lib/news/feed";
import { getNewsReelDurationSeconds, toReelStory, type ReelPreferences, type ReelStory, type ReelStoryRecord } from "@/src/lib/news/reel";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const emptyPreferences: ReelPreferences = { topics: [], countries: [], companies: [], people: [], keywords: [], hiddenTopics: [] };

function preferenceList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export default async function NewsReelPage() {
  let stories: ReelStory[] = [];
  let preferences = emptyPreferences;
  try {
    const start = getFreshnessWindowStart("7d");
    const [records, savedPreferences] = await Promise.all([
      db.story.findMany({
        where: start ? { OR: [{ latestPublishedAt: { gte: start } }, { latestPublishedAt: null, lastUpdatedAt: { gte: start } }] } : undefined,
        take: 100,
        orderBy: [{ latestPublishedAt: "desc" }, { lastUpdatedAt: "desc" }],
        include: { primaryCategory: true, storySources: { include: { source: true, article: true } } },
      }),
      db.userPreference.findFirst(),
    ]);
    stories = records.map((record) => toReelStory(record as unknown as ReelStoryRecord));
    if (savedPreferences) {
      preferences = {
        topics: preferenceList(savedPreferences.topics),
        countries: preferenceList(savedPreferences.countries),
        companies: preferenceList(savedPreferences.companies),
        people: preferenceList(savedPreferences.people),
        keywords: preferenceList(savedPreferences.keywords),
        hiddenTopics: preferenceList(savedPreferences.hiddenTopics),
      };
    }
  } catch {
    // The reel stays usable as an empty state while the database is unavailable.
  }

  return <NewsReel initialStories={stories} initialPreferences={preferences} durationSeconds={getNewsReelDurationSeconds()} />;
}
