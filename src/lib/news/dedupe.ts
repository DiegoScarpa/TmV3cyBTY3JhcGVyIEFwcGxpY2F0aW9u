import { jaccardSimilarity, normalizeTitle } from "@/src/lib/utils";

export type DedupeCandidate = { title: string; canonicalUrl: string; contentHash?: string | null; content?: string | null };

export function areDuplicateArticles(left: DedupeCandidate, right: DedupeCandidate) {
  if (left.canonicalUrl === right.canonicalUrl) return true;
  if (left.contentHash && right.contentHash && left.contentHash === right.contentHash) return true;
  const titleSimilarity = jaccardSimilarity(left.title, right.title);
  if (titleSimilarity >= 0.78) return true;
  if (left.content && right.content && jaccardSimilarity(left.content.slice(0, 5000), right.content.slice(0, 5000)) >= 0.9) return true;
  return false;
}

export function storySimilarity(leftTitle: string, rightTitle: string) {
  const left = normalizeTitle(leftTitle);
  const right = normalizeTitle(rightTitle);
  if (left === right) return 1;
  return jaccardSimilarity(left, right);
}

export function shouldJoinStory(leftTitle: string, rightTitle: string, daysApart = 0) {
  if (daysApart > 5) return false;
  return storySimilarity(leftTitle, rightTitle) >= 0.42;
}
