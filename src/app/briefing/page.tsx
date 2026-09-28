import Link from "next/link";
import { db } from "@/src/lib/db";
import { demoStories } from "@/src/lib/demo";
import { StoryCard } from "@/src/components/story-card";
import type { StoryCardData } from "@/src/components/story-card";

export default async function BriefingPage() {
  let stories: StoryCardData[] = demoStories;
  try { const rows = await db.story.findMany({ take: 10, orderBy: [{ importanceScore: "desc" }, { lastUpdatedAt: "desc" }], include: { primaryCategory: true, storySources: { include: { source: true } } } }); if (rows.length) stories = rows.map((story) => ({ id: story.id, headline: story.headline, category: story.primaryCategory.name, summary: story.summary, updatedAt: story.lastUpdatedAt, sourceNames: [...new Set(story.storySources.map((item) => item.source.name))], sourceCount: story.storySources.length, importanceScore: story.importanceScore })); } catch {}
  return <main className="content"><Link className="muted" href="/">← Dashboard</Link><div className="eyebrow" style={{ marginTop: 48 }}>Daily briefing · Good morning</div><h1 style={{ maxWidth: 780 }}>The signal in your morning feed.</h1><p className="lede">A compact, source-transparent briefing of the stories that matter most to your selected interests.</p><div className="section-header"><h2>Top 10 stories</h2><span>Facts first · uncertainty preserved</span></div><div className="story-grid">{stories.map((story) => <StoryCard story={story} key={story.id} />)}</div><div className="panel" style={{ marginTop: 24 }}><div className="eyebrow">What changed since yesterday</div><p className="lede" style={{ marginBottom: 0 }}>Once the scheduler has a previous briefing, this section compares newly updated stories and calls out meaningful changes without repeating unchanged coverage.</p></div></main>;
}
