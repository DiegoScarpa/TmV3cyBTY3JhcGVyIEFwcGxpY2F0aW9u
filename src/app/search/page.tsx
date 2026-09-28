import Link from "next/link";
import { db } from "@/src/lib/db";
import { demoStories } from "@/src/lib/demo";
import { StoryCard, type StoryCardData } from "@/src/components/story-card";
import { TOPIC_GROUPS } from "@/src/lib/news/topic-taxonomy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string; topic?: string }> }) {
  const params = await searchParams;
  const query = params.q?.trim() || params.category?.trim() || "";
  const topic = params.topic?.trim() || "";
  const group = TOPIC_GROUPS.find((item) => item.slug === topic || item.topics.some((name) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-") === topic));
  let results: StoryCardData[] = demoStories.filter((story) => !query && !topic || `${story.headline} ${story.category} ${story.summary}`.toLowerCase().includes((query || topic).toLowerCase().replace(/-/g, " ")));
  try {
    const filters = [] as object[];
    if (query) filters.push({ OR: [{ headline: { contains: query, mode: "insensitive" as const } }, { summary: { contains: query, mode: "insensitive" as const } }, { whyItMatters: { contains: query, mode: "insensitive" as const } }, { analysis: { is: { whatHappened: { contains: query, mode: "insensitive" as const } } } }, { primaryCategory: { name: { contains: query, mode: "insensitive" as const } } }] });
    if (topic) filters.push({ OR: [{ storyTopics: { some: { topic: { slug: topic } } } }, { primaryCategory: { slug: topic } }] });
    const rows = await db.story.findMany({ where: filters.length ? { AND: filters } : undefined, take: 30, orderBy: { lastUpdatedAt: "desc" }, include: { primaryCategory: true, storySources: { include: { source: true } } } });
    if (rows.length) results = rows.map((story) => ({ id: story.id, headline: story.headline, category: story.primaryCategory.name, summary: story.summary, updatedAt: story.lastUpdatedAt, sourceNames: [...new Set(story.storySources.map((item) => item.source.name))], sourceCount: new Set(story.storySources.map((item) => item.sourceId)).size, importanceScore: story.importanceScore }));
  } catch {}
  return <main className="content"><Link className="muted" href="/">← Dashboard</Link><div className="eyebrow" style={{ marginTop: 48 }}>Search intelligence</div><h1 style={{ maxWidth: 780 }}>Find the story behind the headline.</h1><form className="search-box" style={{ margin: "28px 0" }}><input name="q" defaultValue={query} placeholder="OpenAI, interest rates, Argentina..." /><button className="button primary">Search</button></form>{group && <div className="topic-subnav"><strong>{group.name}</strong>{group.topics.map((name) => <Link href={`/search?topic=${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`} key={name}>{name}</Link>)}</div>}<div className="section-header"><h2>{topic ? `Topic: ${group?.name ?? topic.replace(/-/g, " ")}` : query ? `Results for “${query}”` : "Recent stories"}</h2><span>{results.length} stories</span></div><div className="story-grid">{results.length ? results.map((story) => <StoryCard story={story} key={story.id} />) : <div className="empty">No stories matched that search. If evidence is unavailable, the application does not manufacture analysis.</div>}</div></main>;
}
