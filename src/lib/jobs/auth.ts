export function isIngestionAuthorized(request: Request) {
  if (process.env.NODE_ENV !== "production") return true;
  const expected = process.env.CRON_SECRET || process.env.INGESTION_SECRET;
  if (!expected) return false;
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return request.headers.get("x-ingestion-secret") === expected || bearer === expected;
}
