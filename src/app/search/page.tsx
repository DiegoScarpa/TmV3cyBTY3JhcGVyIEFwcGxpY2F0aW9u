import Link from "next/link";
import { db } from "@/src/lib/db";
import { demoStories } from "@/src/lib/demo";
import { StoryCard } from "@/src/components/story-card";
import type { StoryCardData } from "@/src/components/story-card";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string }> }) {
  const params = await searchParams; const query = params.q?.trim() || params.category?.trim() || "";
  let results: StoryCardData[] = demoStories.filter((story) => !query || `${story.headline} ${story.category} ${story.summary}`.toLowerCase().includes(query.toLowerCase()));
  try { const rows = await db.story.findMany({ where: query ? { OR: [{ headline: { contains: query, mode: "insensitive" } }, { summary: { contains: query, mode: "insensitive" } }, { primaryCategory: { name: { contains: query, mode: "insensitive" } } }] } : undefined, take: 30, orderBy: { lastUpdatedAt: "desc" }, include: { primaryCategory: true, storySources: { include: { source: true } } } }); if (rows.length) results = rows.map((story) => ({ id: story.id, headline: story.headline, category: story.primaryCategory.name, summary: story.summary, updatedAt: story.lastUpdatedAt, sourceNames: [...new Set(story.storySources.map((item) => item.source.name))], sourceCount: story.storySources.length, importanceScore: story.importanceScore })); } catch {}
  return <main className="content"><Link className="muted" href="/">← Dashboard</Link><div className="eyebrow" style={{ marginTop: 48 }}>Search intelligence</div><h1 style={{ maxWidth: 780 }}>Find the story behind the headline.</h1><form className="search-box" style={{ margin: "28px 0" }}><input name="q" defaultValue={query} placeholder="OpenAI, interest rates, Argentina..." /><button className="button primary">Search</button></form><div className="section-header"><h2>{query ? `Results for “${query}”` : "Recent stories"}</h2><span>{results.length} stories</span></div><div className="story-grid">{results.length ? results.map((story) => <StoryCard story={story} key={story.id} />) : <div className="empty">No stories matched that search.</div>}</div></main>;
}
