import Link from "next/link";
import { db } from "@/src/lib/db";
import { demoCategories, demoStories } from "@/src/lib/demo";
import { DashboardSearch } from "@/src/components/dashboard-search";
import { StoryCard, type StoryCardData } from "@/src/components/story-card";
import { IngestButton } from "@/src/components/ingest-button";
import { getFreshnessWindowStart, type FeedMode, type FreshnessWindow, freshnessWindows } from "@/src/lib/news/feed";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getStories(mode: FeedMode, window: FreshnessWindow): Promise<StoryCardData[]> {
  try {
    const start = getFreshnessWindowStart(window);
    const stories = await db.story.findMany({
      where: start ? { OR: [{ latestPublishedAt: { gte: start } }, { latestPublishedAt: null, lastUpdatedAt: { gte: start } }] } : undefined,
      take: 24,
      orderBy: mode === "latest" ? [{ latestPublishedAt: "desc" }, { lastUpdatedAt: "desc" }] : [{ importanceScore: "desc" }, { relevanceScore: "desc" }, { lastUpdatedAt: "desc" }],
      include: { primaryCategory: true, storySources: { include: { source: true } } },
    });
    if (stories.length) return stories.map((story) => ({
      id: story.id,
      headline: story.headline,
      category: story.primaryCategory.name,
      summary: story.summary,
      updatedAt: story.lastUpdatedAt,
      latestPublishedAt: story.latestPublishedAt,
      firstReportedAt: story.firstReportedAt,
      sourceNames: [...new Set(story.storySources.map((item) => item.source.name))],
      sourceCount: new Set(story.storySources.map((item) => item.sourceId)).size,
      importanceScore: story.importanceScore,
      relevanceScore: story.relevanceScore,
    }));
  } catch {
    // Do not render seeded/stale content when the live database is unavailable.
    return [];
  }
  return demoStories;
}

export default async function HomePage({ searchParams }: { searchParams: Promise<{ mode?: string; window?: string }> }) {
  const params = await searchParams;
  const mode: FeedMode = params.mode === "top" ? "top" : "latest";
  const window: FreshnessWindow = params.window === "1h" || params.window === "6h" || params.window === "3d" || params.window === "7d" || params.window === "all" || params.window === "24h" ? params.window : mode === "top" ? "all" : "24h";
  const stories = await getStories(mode, window);
  const featured = stories[0];
  const today = new Intl.DateTimeFormat(undefined, { dateStyle: "long" }).format(new Date());
  const linkFor = (nextMode: FeedMode, nextWindow = window) => ({ pathname: "/", query: { mode: nextMode, window: nextWindow } });
  return <main className="content">
    <div className="hero-row"><div><div className="eyebrow">Personal briefing · {today}</div><h1>Know what changed.<br /><span style={{ color: "var(--accent)" }}>Understand why.</span></h1><p className="lede">News Intelligence gathers independent coverage, groups duplicate reporting into stories, and keeps every claim connected to its original source.</p></div><div><DashboardSearch /><div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end", gap: 8 }}><Link className="button primary" href="/news-reel">News Reel</Link><IngestButton /></div></div></div>
    <nav className="topic-nav">{demoCategories.map((category, index) => <Link className={`topic-pill${index === 0 ? " active" : ""}`} href={index === 0 ? "/" : `/search?category=${encodeURIComponent(category)}`} key={category}>{category}</Link>)}</nav>
    <div className="feed-toolbar"><div className="feed-tabs"><Link className={mode === "latest" ? "active" : ""} href={linkFor("latest", window === "all" ? "24h" : window)}>Latest</Link><Link className={mode === "top" ? "active" : ""} href={linkFor("top", window === "24h" ? "all" : window)}>Top stories</Link></div><div className="freshness-filters">{freshnessWindows.map((item) => <Link className={item.value === window ? "active" : ""} href={linkFor(mode, item.value)} key={item.value}>{item.label}</Link>)}</div></div>
    <div className="section-header"><h2>{mode === "latest" ? "Latest" : "Top stories"}</h2><span>{mode === "latest" ? "Newest source publication first" : "Important and relevant coverage first"} · {freshnessWindows.find((item) => item.value === window)?.label}</span></div>
    {stories.length ? <div className="story-grid">{featured && <StoryCard story={{ ...featured, featured: true }} />}{stories.slice(1, 6).map((story) => <StoryCard story={story} key={story.id} />)}</div> : <div className="empty"><strong>No live stories are available.</strong><br />Connect PostgreSQL, run the seed command, or refresh the feeds to populate this view.</div>}
    <div className="layout-two"><section><div className="section-header"><h2>{mode === "latest" ? "Latest updates" : "More top stories"}</h2><span>Source-grounded coverage</span></div><div className="story-grid">{stories.slice(6).map((story) => <StoryCard story={story} key={story.id} />)}</div></section><aside className="panel"><div className="eyebrow">Your focus</div><h2 style={{ marginTop: 8 }}>A briefing shaped around your interests.</h2><p className="muted" style={{ lineHeight: 1.6 }}>Follow topics, companies, people, countries, keywords, and sources. Your choices influence ordering, never the facts.</p><Link className="button primary" href="/settings">Customize briefing</Link><div className="side-list"><Link href="/briefing"><span>Good morning briefing</span><span>→</span></Link><Link href="/timeline"><span>News timeline</span><span>→</span></Link><Link href="/status"><span>System status</span><span>→</span></Link></div></aside></div>
  </main>;
}
