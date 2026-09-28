import Link from "next/link";
import { db } from "@/src/lib/db";
import { demoCategories, demoStories } from "@/src/lib/demo";
import { DashboardSearch } from "@/src/components/dashboard-search";
import { StoryCard, type StoryCardData } from "@/src/components/story-card";
import { IngestButton } from "@/src/components/ingest-button";

async function getStories(): Promise<StoryCardData[]> {
  try {
    const stories = await db.story.findMany({ take: 12, orderBy: [{ importanceScore: "desc" }, { lastUpdatedAt: "desc" }], include: { primaryCategory: true, storySources: { include: { source: true } } } });
    if (stories.length) return stories.map((story) => ({ id: story.id, headline: story.headline, category: story.primaryCategory.name, summary: story.summary, updatedAt: story.lastUpdatedAt, sourceNames: [...new Set(story.storySources.map((item) => item.source.name))], sourceCount: story.storySources.length, importanceScore: story.importanceScore }));
  } catch { /* The dashboard remains useful while local PostgreSQL is being configured. */ }
  return demoStories;
}

export default async function HomePage() {
  const stories = await getStories();
  const featured = stories[0];
  return <main className="content"><div className="hero-row"><div><div className="eyebrow">Personal briefing · September 26, 2026</div><h1>Know what changed.<br /><span style={{ color: "var(--accent)" }}>Understand why.</span></h1><p className="lede">News Intelligence gathers independent coverage, groups duplicate reporting into stories, and keeps every claim connected to its original source.</p></div><div><DashboardSearch /><div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}><IngestButton /></div></div></div><nav className="topic-nav">{demoCategories.map((category, index) => <Link className={`topic-pill${index === 0 ? " active" : ""}`} href={index === 0 ? "/" : `/search?category=${encodeURIComponent(category)}`} key={category}>{category}</Link>)}</nav><div className="section-header"><h2>Top stories</h2><span>Source-grounded · ranked for relevance</span></div><div className="story-grid">{featured && <StoryCard story={{ ...featured, featured: true }} />}{stories.slice(1, 5).map((story) => <StoryCard story={story} key={story.id} />)}</div><div className="layout-two"><section><div className="section-header"><h2>What changed</h2><span>Latest developments</span></div><div className="story-grid">{stories.slice(5).map((story) => <StoryCard story={story} key={story.id} />)}</div></section><aside className="panel"><div className="eyebrow">Your focus</div><h2 style={{ marginTop: 8 }}>A briefing shaped around your interests.</h2><p className="muted" style={{ lineHeight: 1.6 }}>Follow topics, companies, people, countries, keywords, and sources. Your choices influence ordering, never the facts.</p><Link className="button primary" href="/settings">Customize briefing</Link><div className="side-list"><Link href="/briefing"><span>Good morning briefing</span><span>→</span></Link><Link href="/timeline"><span>News timeline</span><span>→</span></Link><Link href="/status"><span>System status</span><span>→</span></Link></div></aside></div></main>;
}
