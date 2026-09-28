export function isIngestionAuthorized(request: Request) {
  if (process.env.NODE_ENV !== "production") return true;
  const expected = process.env.CRON_SECRET || process.env.INGESTION_SECRET;
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (expected && (request.headers.get("x-ingestion-secret") === expected || bearer === expected)) return true;
  // The dashboard's manual refresh is same-origin; scheduled/server calls still require the secret.
  if (request.method === "POST") {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");
    if (origin && host && new URL(origin).host === host) return true;
  }
  return false;
}
