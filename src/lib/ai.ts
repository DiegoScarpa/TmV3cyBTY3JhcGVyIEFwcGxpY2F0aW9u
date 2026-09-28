import OpenAI from "openai";
import type { StoryAnalysis } from "./analysis";

const client = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const confidenceSchema = { anyOf: [{ type: "string", enum: ["High", "Medium", "Low"] }, { type: "null" }] } as const;
const evidenceSchema = {
  type: "object", additionalProperties: false,
  properties: { sourceRef: { type: "string" }, passage: { type: "string" }, relationship: { type: "string" } },
  required: ["sourceRef", "passage", "relationship"],
} as const;
const impactItemSchema = {
  type: "object", additionalProperties: false,
  properties: { subject: { type: "string" }, effect: { type: "string" }, mechanism: { type: "string" }, confidence: { type: "string", enum: ["High", "Medium", "Low"] }, sourceRefs: { type: "array", items: { type: "string" } }, direction: { type: "string" } },
  required: ["subject", "effect", "mechanism", "confidence", "sourceRefs", "direction"],
} as const;
const impactSectionSchema = {
  type: "object", additionalProperties: false,
  properties: { relevant: { type: "boolean" }, confidence: confidenceSchema, confidenceScore: { type: "number" }, evidence: { type: "array", items: evidenceSchema }, items: { type: "array", items: impactItemSchema } },
  required: ["relevant", "confidence", "confidenceScore", "evidence", "items"],
} as const;
const mapSchema = {
  type: "object", additionalProperties: false,
  properties: { relevant: { type: "boolean" }, confidence: confidenceSchema, confidenceScore: { type: "number" }, evidence: { type: "array", items: evidenceSchema }, items: { type: "array", items: impactItemSchema }, steps: { type: "array", items: { type: "string" } } },
  required: ["relevant", "confidence", "confidenceScore", "evidence", "items", "steps"],
} as const;
const flowSchema = {
  type: "object", additionalProperties: false,
  properties: { relevant: { type: "boolean" }, confidence: confidenceSchema, confidenceScore: { type: "number" }, evidence: { type: "array", items: evidenceSchema }, items: { type: "array", items: impactItemSchema }, steps: { type: "array", items: { type: "string" } }, explanation: { type: "string" } },
  required: ["relevant", "confidence", "confidenceScore", "evidence", "items", "steps", "explanation"],
} as const;

const analysisSchema = {
  type: "object", additionalProperties: false,
  properties: {
    whatHappened: { type: "string" },
    directImpact: impactSectionSchema, indirectImpact: impactSectionSchema, peopleImpact: impactSectionSchema, geographicImpact: impactSectionSchema,
    marketImpact: impactSectionSchema, companyImpact: impactSectionSchema, industryImpact: impactSectionSchema, supplyChainImpact: impactSectionSchema,
    inflationImpact: impactSectionSchema, interestRateImpact: impactSectionSchema, realEstateImpact: impactSectionSchema, energyImpact: impactSectionSchema, consumerImpact: impactSectionSchema, assetImpact: impactSectionSchema,
    impactMap: mapSchema, followTheMoney: flowSchema, supplyChain: impactSectionSchema, companyRelationships: impactSectionSchema,
    entityDetails: { type: "object", additionalProperties: false, properties: { companies: { type: "array", items: { type: "string" } }, industries: { type: "array", items: { type: "string" } }, countries: { type: "array", items: { type: "string" } }, markets: { type: "array", items: { type: "string" } }, potentiallyAffectedCompanies: { type: "array", items: { type: "string" } } }, required: ["companies", "industries", "countries", "markets", "potentiallyAffectedCompanies"] },
  },
  required: ["whatHappened", "directImpact", "indirectImpact", "peopleImpact", "geographicImpact", "marketImpact", "companyImpact", "industryImpact", "supplyChainImpact", "inflationImpact", "interestRateImpact", "realEstateImpact", "energyImpact", "consumerImpact", "assetImpact", "impactMap", "followTheMoney", "supplyChain", "companyRelationships", "entityDetails"],
} as const;

const summarySchema = {
  type: "object", additionalProperties: false,
  properties: {
    headline: { type: "string" }, summary: { type: "string" }, whyItMatters: { type: "string" }, keyFacts: { type: "array", items: { type: "string" } }, whatHappensNext: { type: "string" },
    confidence: { type: "string", enum: ["Confirmed", "Reported", "Developing", "Unclear"] }, entities: { type: "array", items: { type: "string" } }, topics: { type: "array", items: { type: "string" } }, comparison: { type: "array", items: { type: "string" } }, analysis: analysisSchema,
  },
  required: ["headline", "summary", "whyItMatters", "keyFacts", "whatHappensNext", "confidence", "entities", "topics", "comparison", "analysis"],
} as const;

export type StorySummary = {
  headline: string; summary: string; whyItMatters: string; keyFacts: string[]; whatHappensNext: string;
  confidence: "Confirmed" | "Reported" | "Developing" | "Unclear"; entities: string[]; topics: string[]; comparison: string[]; analysis: StoryAnalysis;
};

export async function summarizeStory(packet: string): Promise<StorySummary | null> {
  if (!client) return null;
  const response = await client.responses.create({
    model: process.env.OPENAI_SUMMARY_MODEL || "gpt-4o-mini", store: false,
    input: [
      { role: "system", content: `You are a source-grounded business and news intelligence editor. Use only the supplied sources. Never invent facts, quotes, numbers, dates, sources, URLs, affected companies, tickers, causal relationships, or future events. Preserve disagreement and keep facts separate from analysis.

Every impact category is independent. Do not generate an impact section to fill space. For every section, set relevant=false, confidence=null, confidenceScore=0, evidence=[], and items=[] unless the supplied sources contain meaningful evidence and the relationship is actually relevant. Only use a confidence score at or above the configured internal threshold when evidence supports it. Every evidence record must use an exact supplied source name, a short source-grounded passage, and the factual relationship it supports. If evidence is insufficient, omit the section semantically rather than writing “no impact.”

Keep Direct Impact close to the event and Indirect Impact for second- or third-order effects. Do not jump from an announcement to a stock-price prediction. Explain mechanisms, not investment advice. Never invent a ticker, company relationship, statistic, economic effect, or next event. Low confidence is allowed only when the possibility is useful and still supported by evidence. Identify companies, industries, countries, topics, and markets only when supported. For political stories, remain neutral. What Happened should be 3–6 concise paragraphs when the evidence supports that detail; otherwise state the limitation. Follow-the-money, impact-map, and supply-chain sections must also be disabled when they lack a meaningful evidence-backed relationship.` },
      { role: "user", content: packet },
    ],
    text: { format: { type: "json_schema", name: "business_news_story_analysis", strict: true, schema: summarySchema } },
  });
  return JSON.parse(response.output_text) as StorySummary;
}
