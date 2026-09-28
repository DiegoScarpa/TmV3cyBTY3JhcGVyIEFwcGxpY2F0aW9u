import crypto from "node:crypto";

export function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function stripHtml(value: string) {
  return normalizeWhitespace(value.replace(/<[^>]*>/g, " "));
}

export function normalizeTitle(value: string) {
  return stripHtml(value)
    .toLowerCase()
    .replace(/&[a-z]+;/g, " ")
    .replace(/federal reserve/g, "fed")
    .replace(/\b(keeps?|holds?|leaves?|maintains?)\b/g, "maintain")
    .replace(/\b(rates?|rate)\b/g, "rate")
    .replace(/\b(unchanged|steady|unchanged)\b/g, "stable")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(update|live|breaking|opinion|analysis)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function canonicalizeUrl(input: string) {
  try {
    const url = new URL(input.trim());
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|ref|source|mc_|at_)/i.test(key)) url.searchParams.delete(key);
    }
    url.hostname = url.hostname.toLowerCase();
    url.pathname = url.pathname.replace(/\/+$|^$/, (match) => match ? "" : "/");
    return url.toString();
  } catch {
    return input.trim();
  }
}

export function hashContent(value: string) {
  return crypto.createHash("sha256").update(normalizeWhitespace(value)).digest("hex");
}

export function tokenize(value: string) {
  return new Set(normalizeTitle(value).split(" ").filter((token) => token.length > 2));
}

export function jaccardSimilarity(left: string, right: string) {
  const a = tokenize(left);
  const b = tokenize(right);
  if (!a.size || !b.size) return 0;
  const intersection = [...a].filter((token) => b.has(token)).length;
  return intersection / new Set([...a, ...b]).size;
}

export function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export function safeJson<T>(value: unknown, fallback: T): T {
  return value === null || value === undefined ? fallback : value as T;
}

export function formatRelativeTime(date: Date | string | null | undefined) {
  if (!date) return "Unknown time";
  const timestamp = new Date(date).getTime();
  const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
  if (minutes < 60) return `${minutes || 1}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function formatExactDate(date: Date | string | null | undefined) {
  if (!date) return "Unknown time";
  const timestamp = new Date(date);
  if (Number.isNaN(timestamp.getTime())) return "Unknown time";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(timestamp);
}
