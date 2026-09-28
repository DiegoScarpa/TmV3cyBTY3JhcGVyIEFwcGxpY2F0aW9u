import { clamp } from "@/src/lib/utils";

export type RankingInput = {
  publishedAt?: Date | null;
  sourceCount: number;
  reliability: number;
  relevance: number;
  developing?: boolean;
  majorChange?: boolean;
  geographicScope?: number;
};

export function calculateImportance(input: RankingInput) {
  const ageHours = input.publishedAt ? Math.max(0, (Date.now() - input.publishedAt.getTime()) / 3_600_000) : 48;
  const recency = Math.exp(-ageHours / 48);
  const sourceDiversity = Math.min(1, input.sourceCount / 4);
  return clamp(
    recency * 0.25 + sourceDiversity * 0.2 + clamp(input.reliability) * 0.15 + clamp(input.relevance) * 0.2 +
      (input.developing ? 0.1 : 0) + (input.majorChange ? 0.07 : 0) + clamp(input.geographicScope ?? 0.5) * 0.03,
  );
}

export function calculateRelevance(text: string, preferences: { topics?: string[]; companies?: string[]; people?: string[]; keywords?: string[] }) {
  const haystack = text.toLowerCase();
  const terms = [...(preferences.topics ?? []), ...(preferences.companies ?? []), ...(preferences.people ?? []), ...(preferences.keywords ?? [])].filter(Boolean);
  if (!terms.length) return 0.5;
  return clamp(terms.reduce((score, term) => score + (haystack.includes(term.toLowerCase()) ? 1 : 0), 0) / Math.min(terms.length, 5));
}
