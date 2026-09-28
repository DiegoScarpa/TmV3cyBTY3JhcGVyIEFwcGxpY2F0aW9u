/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type TouchEvent } from "react";
import {
  mergeUniqueStories,
  rankReelStories,
  reelTopicOptions,
  toReelStory,
  type ReelPreferences,
  type ReelStory,
  type ReelStoryRecord,
  type ReelTopic,
} from "@/src/lib/news/reel";

type NewsReelProps = {
  initialStories: ReelStory[];
  initialPreferences: ReelPreferences;
  durationSeconds: number;
};

function formatRemaining(progress: number, durationSeconds: number) {
  return `${Math.max(0, Math.ceil((1 - progress) * durationSeconds))} sec`;
}

function formatRelativeTime(date: Date | string | null | undefined) {
  if (!date) return "Unknown time";
  const timestamp = new Date(date).getTime();
  if (Number.isNaN(timestamp)) return "Unknown time";
  const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
  if (minutes < 60) return `${minutes || 1}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function formatExactDate(date: Date | string | null | undefined) {
  if (!date) return "Unknown time";
  const timestamp = new Date(date);
  if (Number.isNaN(timestamp.getTime())) return "Unknown time";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(timestamp);
}

function apiStoryToReelStory(value: ReelStoryRecord) {
  return toReelStory(value);
}

export function NewsReel({ initialStories, initialPreferences, durationSeconds }: NewsReelProps) {
  const router = useRouter();
  const [availableStories, setAvailableStories] = useState(initialStories);
  const [selectedTopic, setSelectedTopic] = useState<ReelTopic>("all");
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

  const resetTimer = useCallback(() => {
    elapsedRef.current = 0;
    setProgress(0);
  }, []);

  const goNext = useCallback(() => {
    if (!queueRef.current.length) return;
    resetTimer();
    setActiveIndex((index) => {
      if (index < queueRef.current.length - 1) return index + 1;
      setEnded(true);
      setPaused(true);
      return index;
    });
  }, [resetTimer]);

  const goPrevious = useCallback(() => {
    if (!queueRef.current.length) return;
    resetTimer();
    setEnded(false);
    setPaused(false);
    setActiveIndex((index) => Math.max(0, index - 1));
  }, [resetTimer]);

  const togglePaused = useCallback(() => {
    if (!started || ended) return;
    setPaused((current) => !current);
  }, [ended, started]);

  const startReel = useCallback(() => {
    const nextQueue = rankReelStories(availableStories, selectedTopic, initialPreferences);
    setQueue(nextQueue);
    setActiveIndex(0);
    setStarted(true);
    setEnded(false);
    setPaused(false);
    resetTimer();
  }, [availableStories, initialPreferences, resetTimer, selectedTopic]);

  const restartReel = useCallback(() => {
    const nextQueue = rankReelStories(availableStories, selectedTopic, initialPreferences);
    setQueue(nextQueue);
    setActiveIndex(0);
    setStarted(true);
    setEnded(false);
    setPaused(false);
    resetTimer();
  }, [availableStories, initialPreferences, resetTimer, selectedTopic]);

  const changeTopic = useCallback(() => {
    setStarted(false);
    setEnded(false);
    setPaused(false);
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    if (!started || paused || ended || !queue.length) return;
    const startAt = performance.now() - elapsedRef.current;
    let frame = 0;
    const tick = () => {
      const elapsed = performance.now() - startAt;
      elapsedRef.current = elapsed;
      const nextProgress = Math.min(1, elapsed / durationMs);
      setProgress(nextProgress);
      if (elapsed >= durationMs) {
        goNext();
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [activeIndex, durationMs, ended, goNext, paused, queue.length, started]);

  useEffect(() => {
    if (pendingNewStoriesIndexRef.current === null || !queue.length) return;
    const nextIndex = Math.min(pendingNewStoriesIndexRef.current, queue.length - 1);
    pendingNewStoriesIndexRef.current = null;
    setActiveIndex(nextIndex);
    setEnded(false);
    setPaused(false);
    resetTimer();
  }, [queue.length, resetTimer]);

  useEffect(() => {
    if (!started) return;
    const pollForUpdates = async () => {
      try {
        const response = await fetch("/api/stories?mode=latest&window=7d", { cache: "no-store" });
        if (!response.ok) return;
        const body = await response.json() as ReelStoryRecord[];
        const incoming = body.map(apiStoryToReelStory);
        setAvailableStories((current) => mergeUniqueStories(current, incoming));
        const incomingForTopic = rankReelStories(incoming, selectedTopic, initialPreferences);
        setQueue((current) => {
          const currentIds = new Set(current.map((story) => story.id));
          const additions = incomingForTopic.filter((story) => !currentIds.has(story.id));
          if (endedRef.current && additions.length) pendingNewStoriesIndexRef.current = current.length;
          return mergeUniqueStories(current, incomingForTopic);
        });
        setLiveStatus(incoming.length ? "Live updates checked" : "No new updates");
      } catch {
        setLiveStatus("Live update check failed");
      }
    };
    const timer = window.setInterval(pollForUpdates, 60_000);
    return () => window.clearInterval(timer);
  }, [initialPreferences, selectedTopic, started]);

  useEffect(() => {
    if (!started) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        router.push("/");
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        goNext();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        goPrevious();
      } else if (event.key === " " || event.key === "Spacebar") {
        event.preventDefault();
        togglePaused();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrevious, router, started, togglePaused]);

  useEffect(() => {
    if (!nextStory?.imageUrl) return;
    const image = new Image();
    image.src = nextStory.imageUrl;
  }, [nextStory]);

  function handleTouchStart(event: TouchEvent<HTMLElement>) {
    const touch = event.changedTouches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }

  function handleTouchEnd(event: TouchEvent<HTMLElement>) {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    lastTouchAtRef.current = Date.now();
    if (!start) return;
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX < 0) goNext();
      else goPrevious();
    } else if (Math.abs(deltaX) < 12 && Math.abs(deltaY) < 12) {
      togglePaused();
    }
  }

  function handleCardClick() {
    if (Date.now() - lastTouchAtRef.current < 500) return;
    togglePaused();
  }

  if (!started) {
    return <main className="reel-shell"><section className="reel-intro"><Link className="reel-back" href="/">← Back to News</Link><div className="eyebrow">News Intelligence · News Reel</div><h1>Watch the news<br /><span>as it develops.</span></h1><p className="lede">A focused, hands-free briefing. Each story stays on screen for {durationSeconds} seconds, with source-grounded context and live updates added to the queue.</p><div className="reel-topic-picker"><div className="reel-picker-label">Choose your feed</div><div className="reel-topic-options">{reelTopicOptions.map((topic) => <button className={`reel-topic-option${selectedTopic === topic.value ? " active" : ""}`} key={topic.value} onClick={() => setSelectedTopic(topic.value)}>{topic.label}</button>)}</div></div><div className="reel-intro-actions"><button className="button primary reel-start" onClick={startReel}>Start News Reel <span>→</span></button><span className="muted">{rankedStories.length} stories ready · {durationSeconds}s each</span></div></section></main>;
  }

  if (!activeStory || ended) {
    return <main className="reel-shell"><section className="reel-ended"><div className="reel-ended-mark">✓</div><div className="eyebrow">{activeTopicLabel}</div><h1>You&apos;ve reached the end<br />of the latest news.</h1><p className="lede">{liveStatus === "Live updates checked" ? "New coverage will continue here when it arrives." : "Restart to replay the newest available stories, or choose another topic."}</p><div className="reel-ended-actions"><button className="button primary" onClick={restartReel}>Restart</button><button className="button" onClick={changeTopic}>Change topic</button><Link className="button" href="/">Back to News</Link></div></section></main>;
  }

  const sourceLabel = activeStory.sourceNames.length ? activeStory.sourceNames.slice(0, 2).join(" · ") : "Source being verified";
  return <main className="reel-shell" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
    <section className="reel-stage" aria-label="News Reel">
      <div className="reel-topline"><Link className="reel-back" href="/">← Exit</Link><span className="reel-live-label"><span className="reel-live-dot" />{activeTopicLabel}{liveStatus ? ` · ${liveStatus}` : ""}</span><span>{activeIndex + 1} / {queue.length}</span></div>
      <article className="reel-card" onClick={handleCardClick}>
        <div className="reel-image-wrap">{activeStory.imageUrl ? <img className="reel-image" src={activeStory.imageUrl} alt="" /> : <div className="reel-image-fallback"><span>NI</span><small>News Intelligence</small></div>}<div className="reel-image-overlay" /></div>
        <div className="reel-copy">
          <div className="reel-progress-row"><span>{paused ? "Paused" : "Now playing"}</span><span>{formatRemaining(progress, durationSeconds)}</span></div>
          <div className="reel-progress-track" aria-label={`${Math.round(progress * 100)} percent of story duration`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}><span style={{ width: `${progress * 100}%` }} /></div>
          <div className="reel-story-content"><div className="story-category">{activeStory.category}</div><h1 aria-live="polite">{activeStory.headline}</h1><p className="reel-summary">{activeStory.summary || "Coverage is being gathered. A source-grounded synthesis will appear when enough public information is available."}</p><div className="reel-why"><div className="eyebrow">Why it matters</div><p>{activeStory.whyItMatters || "The significance is still being evaluated from the available coverage."}</p></div><div className="reel-source-line">{activeStory.sourceUrl ? <a href={activeStory.sourceUrl} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}><strong>{sourceLabel} ↗</strong></a> : <strong>{sourceLabel}</strong>}<span title={formatExactDate(activeStory.latestPublishedAt ?? activeStory.lastUpdatedAt)}>· {formatRelativeTime(activeStory.latestPublishedAt ?? activeStory.lastUpdatedAt)}</span></div><div className="reel-source-caption">{activeStory.sourceNames.length > 2 ? `+${activeStory.sourceNames.length - 2} more independent sources` : "Original reporting linked below"}</div></div>
          <div className="reel-controls" onClick={(event) => event.stopPropagation()}><button className="reel-control" aria-label="Previous story" onClick={goPrevious}>←</button><button className="reel-control reel-control-main" aria-label={paused ? "Play story" : "Pause story"} aria-pressed={paused} onClick={togglePaused}>{paused ? "▶" : "Ⅱ"}</button><button className="reel-control" aria-label="Next story" onClick={goNext}>→</button><button className="reel-control" aria-label={muted ? "Unmute audio" : "Mute audio"} aria-pressed={muted} onClick={() => setMuted((value) => !value)}>{muted ? "⌁" : "◖"}</button><Link className="reel-open-story" href={`/stories/${activeStory.id}`} onClick={(event) => event.stopPropagation()}>Open story ↗</Link></div>
        </div>
      </article>
      <div className="reel-footer"><span>Space pause/play · ← → navigate · Esc exit</span><button className="reel-change-topic" onClick={changeTopic}>Change topic</button></div>
    </section>
  </main>;
}
