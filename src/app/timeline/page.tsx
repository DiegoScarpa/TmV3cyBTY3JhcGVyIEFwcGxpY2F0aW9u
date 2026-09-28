import Link from "next/link";
import { db } from "@/src/lib/db";
import { demoStories } from "@/src/lib/demo";
import { formatRelativeTime } from "@/src/lib/utils";

export default async function TimelinePage() {
  let items: { id: string; headline: string; category: string; updatedAt: Date | string; summary?: string | null }[] = demoStories;
  try { const rows = await db.story.findMany({ take: 40, orderBy: { lastUpdatedAt: "desc" }, include: { primaryCategory: true } }); if (rows.length) items = rows.map((story) => ({ id: story.id, headline: story.headline, category: story.primaryCategory.name, updatedAt: story.lastUpdatedAt, summary: story.summary })); } catch {}
  return <main className="content"><Link className="muted" href="/">← Dashboard</Link><div className="eyebrow" style={{ marginTop: 48 }}>Chronological view</div><h1 style={{ maxWidth: 700 }}>The news, in sequence.</h1><p className="lede">Follow today, yesterday, and this week with category filters coming from the same story graph.</p><div className="panel" style={{ marginTop: 34 }}>{items.map((item) => <Link href={`/stories/${item.id}`} className="source-card" key={item.id}><div><div className="story-category">{item.category}</div><strong style={{ display: "block", marginTop: 6 }}>{item.headline}</strong><div className="muted" style={{ marginTop: 5 }}>{item.summary}</div></div><span className="muted">{formatRelativeTime(item.updatedAt)}</span></Link>)}</div></main>;
}
