"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type TouchEvent } from "react";
import { mergeUniqueStories, rankReelStories, reelDensityOptions, reelTopicOptions, toReelStory, type ReelDensity, type ReelPreferences, type ReelStory, type ReelStoryRecord, type ReelTopic } from "@/src/lib/news/reel";

type NewsReelProps = { initialStories: ReelStory[]; initialPreferences: ReelPreferences; durationSeconds: number };

function formatRemaining(progress: number, durationSeconds: number) { return `${Math.max(0, Math.ceil((1 - progress) * durationSeconds))} sec`; }
function formatRelativeTime(date: Date | string | null | undefined) { if (!date) return "Unknown time"; const timestamp = new Date(date).getTime(); if (Number.isNaN(timestamp)) return "Unknown time"; const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000)); if (minutes < 60) return `${minutes || 1}m ago`; const hours = Math.round(minutes / 60); if (hours < 24) return `${hours}h ago`; return `${Math.round(hours / 24)}d ago`; }
function formatExactDate(date: Date | string | null | undefined) { if (!date) return "Unknown time"; const timestamp = new Date(date); if (Number.isNaN(timestamp.getTime())) return "Unknown time"; return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(timestamp); }
function shorten(value: string, limit: number) { return value.length > limit ? `${value.slice(0, limit).trimEnd()}…` : value; }
function apiStoryToReelStory(value: ReelStoryRecord) { return toReelStory(value); }

export function NewsReel({ initialStories, initialPreferences, durationSeconds }: NewsReelProps) {
  const router = useRouter();
  const [availableStories, setAvailableStories] = useState(initialStories);
  const [selectedTopic, setSelectedTopic] = useState<ReelTopic>("all");
  const [density, setDensity] = useState<ReelDensity>("balanced");
  const [queue, setQueue] = useState<ReelStory[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [ended, setEnded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [muted, setMuted] = useState(true);
  const [liveStatus, setLiveStatus] = useState("");
  const elapsedRef = useRef(0);
  const queueRef = useRef(queue);
  const endedRef = useRef(ended);
  const pendingNewStoriesIndexRef = useRef<number | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const lastTouchAtRef = useRef(0);
  queueRef.current = queue;
  endedRef.current = ended;

  const durationMs = durationSeconds * 1000;
  const activeStory = queue[activeIndex];
  const nextStory = queue[activeIndex + 1];
  const activeTopicLabel = reelTopicOptions.find((topic) => topic.value === selectedTopic)?.label ?? "All News";
  const rankedStories = useMemo(() => rankReelStories(availableStories, selectedTopic, initialPreferences), [availableStories, selectedTopic, initialPreferences]);
  const resetTimer = useCallback(() => { elapsedRef.current = 0; setProgress(0); }, []);

  const goNext = useCallback(() => {
    if (!queueRef.current.length) return;
    resetTimer();
    setActiveIndex((index) => { if (index < queueRef.current.length - 1) return index + 1; setEnded(true); setPaused(true); return index; });
  }, [resetTimer]);
  const goPrevious = useCallback(() => { if (!queueRef.current.length) return; resetTimer(); setEnded(false); setPaused(false); setActiveIndex((index) => Math.max(0, index - 1)); }, [resetTimer]);
  const togglePaused = useCallback(() => { if (!started || ended) return; setPaused((current) => !current); }, [ended, started]);
  const startReel = useCallback(() => { const nextQueue = rankReelStories(availableStories, selectedTopic, initialPreferences); setQueue(nextQueue); setActiveIndex(0); setStarted(true); setEnded(false); setPaused(false); resetTimer(); }, [availableStories, initialPreferences, resetTimer, selectedTopic]);
  const restartReel = useCallback(() => { const nextQueue = rankReelStories(availableStories, selectedTopic, initialPreferences); setQueue(nextQueue); setActiveIndex(0); setStarted(true); setEnded(false); setPaused(false); resetTimer(); }, [availableStories, initialPreferences, resetTimer, selectedTopic]);
  const changeTopic = useCallback(() => { setStarted(false); setEnded(false); setPaused(false); resetTimer(); }, [resetTimer]);

  useEffect(() => {
    if (!started || paused || ended || !queue.length) return;
    const startAt = performance.now() - elapsedRef.current;
    let frame = 0;
    const tick = () => { const elapsed = performance.now() - startAt; elapsedRef.current = elapsed; setProgress(Math.min(1, elapsed / durationMs)); if (elapsed >= durationMs) { goNext(); return; } frame = requestAnimationFrame(tick); };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [activeIndex, durationMs, ended, goNext, paused, queue.length, started]);

  useEffect(() => {
    if (pendingNewStoriesIndexRef.current === null || !queue.length) return;
    const nextIndex = Math.min(pendingNewStoriesIndexRef.current, queue.length - 1);
    pendingNewStoriesIndexRef.current = null; setActiveIndex(nextIndex); setEnded(false); setPaused(false); resetTimer();
  }, [queue.length, resetTimer]);

  useEffect(() => {
    if (!started) return;
    const pollForUpdates = async () => {
      try {
        const response = await fetch("/api/stories?mode=latest&window=7d", { cache: "no-store" });
        if (!response.ok) return;
        const incoming = (await response.json() as ReelStoryRecord[]).map(apiStoryToReelStory);
        setAvailableStories((current) => mergeUniqueStories(current, incoming));
        const incomingForTopic = rankReelStories(incoming, selectedTopic, initialPreferences);
        setQueue((current) => { const currentIds = new Set(current.map((story) => story.id)); const additions = incomingForTopic.filter((story) => !currentIds.has(story.id)); if (endedRef.current && additions.length) pendingNewStoriesIndexRef.current = current.length; return mergeUniqueStories(current, incomingForTopic); });
        setLiveStatus(incoming.length ? "Live updates checked" : "No new updates");
      } catch { setLiveStatus("Live update check failed"); }
    };
    const timer = window.setInterval(pollForUpdates, 60_000);
    return () => window.clearInterval(timer);
  }, [initialPreferences, selectedTopic, started]);

  useEffect(() => {
    if (!started) return;
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); router.push("/"); } else if (event.key === "ArrowRight") { event.preventDefault(); goNext(); } else if (event.key === "ArrowLeft") { event.preventDefault(); goPrevious(); } else if (event.key === " " || event.key === "Spacebar") { event.preventDefault(); togglePaused(); } };
    window.addEventListener("keydown", handleKeyDown); return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrevious, router, started, togglePaused]);

  useEffect(() => { if (!nextStory?.imageUrl) return; const image = new Image(); image.src = nextStory.imageUrl; }, [nextStory]);

  function handleTouchStart(event: TouchEvent<HTMLElement>) { const touch = event.changedTouches[0]; touchStartRef.current = { x: touch.clientX, y: touch.clientY }; }
  function handleTouchEnd(event: TouchEvent<HTMLElement>) { const start = touchStartRef.current; touchStartRef.current = null; lastTouchAtRef.current = Date.now(); if (!start) return; const touch = event.changedTouches[0]; const deltaX = touch.clientX - start.x; const deltaY = touch.clientY - start.y; if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) { if (deltaX < 0) goNext(); else goPrevious(); } else if (Math.abs(deltaX) < 12 && Math.abs(deltaY) < 12) togglePaused(); }
  function handleCardClick() { if (Date.now() - lastTouchAtRef.current < 500) return; togglePaused(); }

  if (!started) return <main className="reel-shell"><section className="reel-intro"><Link className="reel-back" href="/">← Back to News</Link><div className="eyebrow">News Intelligence · News Reel</div><h1>Watch the news<br /><span>as it develops.</span></h1><p className="lede">A continuous, source-grounded briefing focused on the forces moving companies, markets, the economy, and everyday life. Each story stays on screen for {durationSeconds} seconds.</p><div className="reel-topic-picker"><div className="reel-picker-label">Choose your feed</div><div className="reel-topic-options">{reelTopicOptions.map((topic) => <button className={`reel-topic-option${selectedTopic === topic.value ? " active" : ""}`} key={topic.value} onClick={() => setSelectedTopic(topic.value)}>{topic.label}</button>)}</div></div><div className="reel-density-picker"><div className="reel-picker-label">Reel density</div><div className="reel-density-options">{reelDensityOptions.map((option) => <button className={`reel-density-option${density === option.value ? " active" : ""}`} key={option.value} onClick={() => setDensity(option.value)}><strong>{option.label}</strong><span>{option.description}</span></button>)}</div></div><div className="reel-intro-actions"><button className="button primary reel-start" onClick={startReel}>Start News Reel <span>→</span></button><span className="muted">{rankedStories.length} stories ready · {durationSeconds}s each</span></div></section></main>;

  if (!activeStory || ended) return <main className="reel-shell"><section className="reel-ended"><div className="reel-ended-mark">✓</div><div className="eyebrow">{activeTopicLabel}</div><h1>You&apos;ve reached the end<br />of the latest news.</h1><p className="lede">{liveStatus === "Live updates checked" ? "New coverage will continue here when it arrives." : "Restart to replay the newest available stories, or choose another topic."}</p><div className="reel-ended-actions"><button className="button primary" onClick={restartReel}>Restart</button><button className="button" onClick={changeTopic}>Change topic</button><Link className="button" href="/">Back to News</Link></div></section></main>;

  const analysis = activeStory.analysis;
  const whatHappened = shorten(analysis?.whatHappened || activeStory.summary || "Coverage is being gathered. A source-grounded synthesis will appear when enough public information is available.", density === "compact" ? 330 : density === "detailed" ? 760 : 520);
  const directItems = analysis?.directImpact.slice(0, density === "compact" ? 2 : 3) ?? [];
  const indirectItems = analysis?.indirectImpact.slice(0, 2) ?? [];
  const peopleItems = analysis?.peopleImpact.slice(0, 2) ?? [];
  const sourceLabel = activeStory.sourceNames.length ? activeStory.sourceNames.slice(0, 2).join(" · ") : "Source being verified";
  const emptyImpact = "Insufficient information to determine the effect reliably.";
  return <main className="reel-shell" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}><section className="reel-stage" aria-label="News Reel"><div className="reel-topline"><Link className="reel-back" href="/">← Exit</Link><span className="reel-live-label"><span className="reel-live-dot" />News Reel{liveStatus ? ` · ${liveStatus}` : ""}</span><span>{activeIndex + 1} / {queue.length}</span></div><article className={`reel-card reel-card-${density}`} onClick={handleCardClick}><div className="reel-copy"><div className="reel-progress-row"><span>{paused ? "Paused" : "Now playing"}</span><span>{formatRemaining(progress, durationSeconds)}</span></div><div className="reel-progress-track" aria-label={`${Math.round(progress * 100)} percent of story duration`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}><span style={{ width: `${progress * 100}%` }} /></div><div className="reel-story-content"><div className="reel-meta-line"><span className="story-category">{activeStory.category}</span><span title={formatExactDate(activeStory.latestPublishedAt ?? activeStory.lastUpdatedAt)}>{formatRelativeTime(activeStory.latestPublishedAt ?? activeStory.lastUpdatedAt)}</span></div><h1 aria-live="polite">{activeStory.headline}</h1><section className="reel-info-section"><div className="reel-section-label">What happened</div><p>{whatHappened}</p></section><section className="reel-info-section"><div className="reel-section-label">Why it matters</div><p>{shorten(activeStory.whyItMatters || "The significance is still being evaluated from the available coverage.", density === "compact" ? 220 : 360)}</p></section><section className="reel-impact-grid"><div className="reel-info-section"><div className="reel-section-label">Direct impact</div>{directItems.length ? directItems.map((item) => <p className="reel-impact-line" key={`${item.subject}-${item.effect}`}><strong>{item.subject}:</strong> {shorten(item.effect, 180)}</p>) : <p>{emptyImpact}</p>}</div>{density !== "compact" && <><div className="reel-info-section"><div className="reel-section-label">Indirect impact</div>{indirectItems.length ? indirectItems.map((item) => <p className="reel-impact-line" key={`${item.subject}-${item.effect}`}><strong>{item.subject}:</strong> {shorten(item.effect, 160)}</p>) : <p>{emptyImpact}</p>}</div><div className="reel-info-section"><div className="reel-section-label">Impact on people</div>{peopleItems.length ? peopleItems.map((item) => <p className="reel-impact-line" key={`${item.subject}-${item.effect}`}><strong>{item.subject}:</strong> {shorten(item.effect, 160)}</p>) : <p>{emptyImpact}</p>}</div></>}</section>{density === "detailed" && <section className="reel-detailed-strip"><span>{activeStory.keyFacts.slice(0, 3).join(" · ") || "Key facts are not available yet."}</span><span>{analysis?.assetImpact.slice(0, 2).map((item) => item.asset).join(" · ") || "No reliable asset connection identified"}</span></section>}<div className="reel-source-line">{activeStory.sourceUrl ? <a href={activeStory.sourceUrl} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}><strong>{sourceLabel} ↗</strong></a> : <strong>{sourceLabel}</strong>}<span title={formatExactDate(activeStory.latestPublishedAt ?? activeStory.lastUpdatedAt)}>· {formatRelativeTime(activeStory.latestPublishedAt ?? activeStory.lastUpdatedAt)}</span></div><div className="reel-source-caption">{activeStory.sourceNames.length > 2 ? `+${activeStory.sourceNames.length - 2} more independent sources` : "Open the story for full analysis and coverage"}</div></div><div className="reel-controls" onClick={(event) => event.stopPropagation()}><button className="reel-control" aria-label="Previous story" onClick={goPrevious}>←</button><button className="reel-control reel-control-main" aria-label={paused ? "Play story" : "Pause story"} aria-pressed={paused} onClick={togglePaused}>{paused ? "▶" : "Ⅱ"}</button><button className="reel-control" aria-label="Next story" onClick={goNext}>→</button><button className="reel-control" aria-label={muted ? "Unmute audio" : "Mute audio"} aria-pressed={muted} onClick={() => setMuted((value) => !value)}>{muted ? "⌁" : "◖"}</button><Link className="reel-open-story" href={`/stories/${activeStory.id}`} onClick={(event) => event.stopPropagation()}>Open full analysis ↗</Link></div></div></article><div className="reel-footer"><span>Space pause/play · ← → navigate · Esc exit</span><button className="reel-change-topic" onClick={changeTopic}>Change topic</button></div></section></main>;
}
