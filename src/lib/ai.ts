import OpenAI from "openai";

const client = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

const summarySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    headline: { type: "string" },
    summary: { type: "string" },
    whyItMatters: { type: "string" },
    keyFacts: { type: "array", items: { type: "string" } },
    whatHappensNext: { type: "string" },
    confidence: { type: "string", enum: ["Confirmed", "Reported", "Developing", "Unclear"] },
    entities: { type: "array", items: { type: "string" } },
    topics: { type: "array", items: { type: "string" } },
    comparison: { type: "array", items: { type: "string" } },
  },
  required: ["headline", "summary", "whyItMatters", "keyFacts", "whatHappensNext", "confidence", "entities", "topics", "comparison"],
} as const;

export type StorySummary = {
  headline: string; summary: string; whyItMatters: string; keyFacts: string[]; whatHappensNext: string;
  confidence: "Confirmed" | "Reported" | "Developing" | "Unclear"; entities: string[]; topics: string[]; comparison: string[];
};

export async function summarizeStory(packet: string): Promise<StorySummary | null> {
  if (!client) return null;
  const response = await client.responses.create({
    model: process.env.OPENAI_SUMMARY_MODEL || "gpt-4o-mini",
    store: false,
    input: [
      { role: "system", content: "You are a careful news editor. Use only the supplied sources. Never invent facts, quotes, numbers, dates, sources, or URLs. Separate reported facts from analysis. Attribute claims. If credible sources differ, preserve and describe that disagreement. For political stories, remain neutral, include relevant dates, and never endorse, rank, or predict candidates or parties. If information is insufficient, say so in confidence and whatHappensNext." },
      { role: "user", content: packet },
    ],
    text: { format: { type: "json_schema", name: "news_story_summary", strict: true, schema: summarySchema } },
  });
  return JSON.parse(response.output_text) as StorySummary;
}
