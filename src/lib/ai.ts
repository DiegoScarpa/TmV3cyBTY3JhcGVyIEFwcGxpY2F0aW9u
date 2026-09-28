import OpenAI from "openai";
import type { StoryAnalysis } from "./analysis";

const client = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

const impactItemSchema = {
  type: "object", additionalProperties: false,
  properties: { subject: { type: "string" }, effect: { type: "string" }, mechanism: { type: "string" }, confidence: { type: "string", enum: ["High", "Medium", "Low"] }, sourceRefs: { type: "array", items: { type: "string" } } },
  required: ["subject", "effect", "mechanism", "confidence", "sourceRefs"],
} as const;
const geographicSchema = {
  type: "object", additionalProperties: false,
  properties: { location: { type: "string" }, effect: { type: "string" }, confidence: { type: "string", enum: ["High", "Medium", "Low"] }, sourceRefs: { type: "array", items: { type: "string" } } },
  required: ["location", "effect", "confidence", "sourceRefs"],
} as const;
const assetSchema = {
  type: "object", additionalProperties: false,
  properties: { asset: { type: "string" }, whyItCouldBeAffected: { type: "string" }, transmissionMechanism: { type: "string" }, direction: { type: "string" }, confidence: { type: "string", enum: ["High", "Medium", "Low"] }, sourceRefs: { type: "array", items: { type: "string" } } },
  required: ["asset", "whyItCouldBeAffected", "transmissionMechanism", "direction", "confidence", "sourceRefs"],
} as const;
const supplyChainSchema = {
  type: "object", additionalProperties: false,
  properties: { stage: { type: "string" }, entity: { type: "string" }, effect: { type: "string" }, confidence: { type: "string", enum: ["High", "Medium", "Low"] }, sourceRefs: { type: "array", items: { type: "string" } } },
  required: ["stage", "entity", "effect", "confidence", "sourceRefs"],
} as const;
const relationshipSchema = {
  type: "object", additionalProperties: false,
  properties: { company: { type: "string" }, relationship: { type: "string" }, effect: { type: "string" }, confidence: { type: "string", enum: ["High", "Medium", "Low"] }, sourceRefs: { type: "array", items: { type: "string" } } },
  required: ["company", "relationship", "effect", "confidence", "sourceRefs"],
} as const;
const flowSchema = {
  type: "object", additionalProperties: false,
  properties: { enabled: { type: "boolean" }, steps: { type: "array", items: { type: "string" } }, explanation: { type: "string" }, confidence: { type: "string", enum: ["High", "Medium", "Low"] }, sourceRefs: { type: "array", items: { type: "string" } } },
  required: ["enabled", "steps", "explanation", "confidence", "sourceRefs"],
} as const;

const analysisSchema = {
  type: "object", additionalProperties: false,
  properties: {
    whatHappened: { type: "string" },
    directImpact: { type: "array", items: impactItemSchema },
    indirectImpact: { type: "array", items: impactItemSchema },
    peopleImpact: { type: "array", items: impactItemSchema },
    geographicImpact: { type: "array", items: geographicSchema },
    assetImpact: { type: "array", items: assetSchema },
    impactMap: { type: "array", items: { type: "string" } },
    followTheMoney: flowSchema,
    supplyChain: { type: "array", items: supplyChainSchema },
    companyRelationships: { type: "array", items: relationshipSchema },
    entityDetails: {
      type: "object", additionalProperties: false,
      properties: { companies: { type: "array", items: { type: "string" } }, industries: { type: "array", items: { type: "string" } }, countries: { type: "array", items: { type: "string" } }, markets: { type: "array", items: { type: "string" } }, potentiallyAffectedCompanies: { type: "array", items: { type: "string" } } },
      required: ["companies", "industries", "countries", "markets", "potentiallyAffectedCompanies"],
    },
  },
  required: ["whatHappened", "directImpact", "indirectImpact", "peopleImpact", "geographicImpact", "assetImpact", "impactMap", "followTheMoney", "supplyChain", "companyRelationships", "entityDetails"],
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
    model: process.env.OPENAI_SUMMARY_MODEL || "gpt-4o-mini",
    store: false,
    input: [
      { role: "system", content: `You are a source-grounded business and news intelligence editor. Use only the supplied sources. Never invent facts, quotes, numbers, dates, sources, URLs, affected companies, tickers, causal relationships, or future events. Every impact item must cite one or more exact source names in sourceRefs; if evidence is insufficient, use an empty list, Low confidence, and explicitly say that the effect cannot be determined reliably. Keep facts separate from analysis. Preserve disagreement between credible sources. For politics, remain neutral and never endorse or predict candidates or parties.

Prioritize useful business intelligence: companies, corporate news, M&A, earnings, CEOs, management, PE, VC, startups, supply chains, manufacturing, real estate, energy, macroeconomics, rates, central banks, and markets. Extract companies, industries, countries, and market connections only when supported. For potentially affected public companies, name a ticker only when the supplied sources establish it; otherwise leave it out. Explain mechanisms, not investment advice. Do not say buy or sell. Distinguish direct effects from second-order effects. A What Happened section should be 3–6 concise paragraphs when the evidence supports it; otherwise state the limitation. Use short, readable analysis items suitable for a news dashboard. Follow-the-money and supply-chain sections should be disabled or empty when no meaningful supported relationship exists.` },
      { role: "user", content: packet },
    ],
    text: { format: { type: "json_schema", name: "business_news_story_analysis", strict: true, schema: summarySchema } },
  });
  return JSON.parse(response.output_text) as StorySummary;
}
