export function getIngestionIntervalMinutes() {
  const configured = Number.parseInt(process.env.NEWS_INGEST_INTERVAL_MINUTES ?? "60", 10);
  return Number.isFinite(configured) && configured > 0 ? configured : 60;
}

export function nextIngestionAt(lastCompletedAt?: Date | string | null) {
  if (!lastCompletedAt) return new Date();
  return new Date(new Date(lastCompletedAt).getTime() + getIngestionIntervalMinutes() * 60_000);
}
