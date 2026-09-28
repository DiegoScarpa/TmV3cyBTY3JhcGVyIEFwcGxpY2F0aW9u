import Link from "next/link";
import { formatExactDate, formatRelativeTime } from "@/src/lib/utils";
import { BookmarkButton } from "./bookmark-button";

export type StoryCardData = { id: string; headline: string; category: string; summary?: string | null; updatedAt?: Date | string | null; latestPublishedAt?: Date | string | null; firstReportedAt?: Date | string | null; sourceNames: string[]; sourceCount: number; importanceScore?: number; relevanceScore?: number; featured?: boolean };

export function StoryCard({ story }: { story: StoryCardData }) {
  const coverageAt = story.latestPublishedAt ?? story.updatedAt;
  return <article className={`story-card${story.featured ? " featured" : ""}`}><div className="story-category">{story.category}</div><Link href={`/stories/${story.id}`}><h3>{story.headline}</h3></Link><p className="story-summary">{story.summary || "Coverage is being gathered. A source-grounded synthesis will appear when enough public information is available."}</p><div className="story-footer"><div><div className="source-list">{story.sourceNames.slice(0, 3).map((source) => <span className="source-chip" key={source}>{source}</span>)}</div><span title={formatExactDate(coverageAt)}>Published {formatRelativeTime(coverageAt)} · Updated {formatRelativeTime(story.updatedAt)}</span></div><BookmarkButton storyId={story.id} /></div></article>;
}
