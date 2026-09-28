export type ImpactConfidence = "High" | "Medium" | "Low";

export type ImpactEvidence = { sourceRef: string; passage: string; relationship: string };
export type ImpactItem = { subject: string; effect: string; mechanism: string; confidence: ImpactConfidence; sourceRefs: string[]; direction?: string };
export type ImpactSection = { relevant: boolean; confidence: ImpactConfidence | null; confidenceScore: number; evidence: ImpactEvidence[]; items: ImpactItem[] };
export type MoneyFlow = ImpactSection & { steps: string[]; explanation: string };
export type ImpactMap = ImpactSection & { steps: string[] };
export type EntityDetails = { companies: string[]; industries: string[]; countries: string[]; markets: string[]; potentiallyAffectedCompanies: string[] };

export type StoryAnalysis = {
  whatHappened: string;
  directImpact: ImpactSection | null;
  indirectImpact: ImpactSection | null;
  peopleImpact: ImpactSection | null;
  geographicImpact: ImpactSection | null;
  marketImpact: ImpactSection | null;
  companyImpact: ImpactSection | null;
  industryImpact: ImpactSection | null;
  supplyChainImpact: ImpactSection | null;
  inflationImpact: ImpactSection | null;
  interestRateImpact: ImpactSection | null;
  realEstateImpact: ImpactSection | null;
  energyImpact: ImpactSection | null;
  consumerImpact: ImpactSection | null;
  assetImpact: ImpactSection | null;
  impactMap: ImpactMap | null;
  followTheMoney: MoneyFlow | null;
  supplyChain: ImpactSection | null;
  companyRelationships: ImpactSection | null;
  entityDetails: EntityDetails;
};

export const EMPTY_ANALYSIS: StoryAnalysis = {
  whatHappened: "Insufficient publicly accessible information is available for a detailed analysis.",
  directImpact: null, indirectImpact: null, peopleImpact: null, geographicImpact: null, marketImpact: null, companyImpact: null, industryImpact: null,
  supplyChainImpact: null, inflationImpact: null, interestRateImpact: null, realEstateImpact: null, energyImpact: null, consumerImpact: null, assetImpact: null,
  impactMap: null, followTheMoney: null, supplyChain: null, companyRelationships: null,
  entityDetails: { companies: [], industries: [], countries: [], markets: [], potentiallyAffectedCompanies: [] },
};

function strings(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : []; }
function confidence(value: unknown): ImpactConfidence | null { return value === "High" || value === "Medium" || value === "Low" ? value : null; }
function scoreFor(value: ImpactConfidence | null, score: unknown) {
  const parsed = typeof score === "number" && Number.isFinite(score) ? score : null;
  if (parsed !== null) return Math.max(0, Math.min(1, parsed));
  return value === "High" ? 0.9 : value === "Medium" ? 0.75 : value === "Low" ? 0.5 : 0;
}

function parseItem(value: unknown): ImpactItem | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const subject = typeof row.subject === "string" ? row.subject.trim() : "";
  const effect = typeof row.effect === "string" ? row.effect.trim() : "";
  if (!subject || !effect) return null;
  return { subject, effect, mechanism: typeof row.mechanism === "string" ? row.mechanism.trim() : "", confidence: confidence(row.confidence) ?? "Low", sourceRefs: strings(row.sourceRefs), direction: typeof row.direction === "string" ? row.direction.trim() : undefined };
}

function parseEvidence(value: unknown): ImpactEvidence[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => {
    if (!entry || typeof entry !== "object") return null;
    const row = entry as Record<string, unknown>;
    const sourceRef = typeof row.sourceRef === "string" ? row.sourceRef.trim() : "";
    const passage = typeof row.passage === "string" ? row.passage.trim() : "";
    const relationship = typeof row.relationship === "string" ? row.relationship.trim() : "";
    return sourceRef && passage && relationship ? { sourceRef, passage, relationship } : null;
  }).filter((entry): entry is ImpactEvidence => Boolean(entry));
}

function parseSection(value: unknown): ImpactSection | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const confidenceValue = confidence(row.confidence);
  const items = Array.isArray(row.items) ? row.items.map(parseItem).filter((entry): entry is ImpactItem => Boolean(entry)) : [];
  return { relevant: row.relevant === true, confidence: confidenceValue, confidenceScore: scoreFor(confidenceValue, row.confidenceScore), evidence: parseEvidence(row.evidence), items };
}

function parseOptionalSection(value: unknown) { return Array.isArray(value) ? null : parseSection(value); }

export function getImpactMinConfidence(value = process.env.IMPACT_MIN_CONFIDENCE) {
  const parsed = Number(value ?? 0.7);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : 0.7;
}

export function isMeaningfulImpact(value: ImpactSection | null | undefined, threshold = getImpactMinConfidence()) {
  return Boolean(value?.relevant && value.confidenceScore >= threshold && value.evidence.length > 0 && value.items.length > 0);
}

function parseMap(value: unknown): ImpactMap | null {
  const parsed = parseSection(value);
  if (!parsed) return null;
  return { ...parsed, steps: strings((value as Record<string, unknown>).steps) };
}

function parseFlow(value: unknown): MoneyFlow | null {
  const parsed = parseSection(value);
  if (!parsed) return null;
  const row = value as Record<string, unknown>;
  return { ...parsed, steps: strings(row.steps), explanation: typeof row.explanation === "string" ? row.explanation.trim() : "" };
}

export function normalizeStoryAnalysis(value: unknown): StoryAnalysis | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  const entities = source.entityDetails && typeof source.entityDetails === "object" ? source.entityDetails as Record<string, unknown> : {};
  return {
    whatHappened: typeof source.whatHappened === "string" ? source.whatHappened : EMPTY_ANALYSIS.whatHappened,
    directImpact: parseOptionalSection(source.directImpact), indirectImpact: parseOptionalSection(source.indirectImpact), peopleImpact: parseOptionalSection(source.peopleImpact), geographicImpact: parseOptionalSection(source.geographicImpact),
    marketImpact: parseOptionalSection(source.marketImpact), companyImpact: parseOptionalSection(source.companyImpact), industryImpact: parseOptionalSection(source.industryImpact), supplyChainImpact: parseOptionalSection(source.supplyChainImpact),
    inflationImpact: parseOptionalSection(source.inflationImpact), interestRateImpact: parseOptionalSection(source.interestRateImpact), realEstateImpact: parseOptionalSection(source.realEstateImpact), energyImpact: parseOptionalSection(source.energyImpact), consumerImpact: parseOptionalSection(source.consumerImpact), assetImpact: parseOptionalSection(source.assetImpact),
    impactMap: parseMap(source.impactMap), followTheMoney: parseFlow(source.followTheMoney), supplyChain: parseOptionalSection(source.supplyChain), companyRelationships: parseOptionalSection(source.companyRelationships),
    entityDetails: { companies: strings(entities.companies), industries: strings(entities.industries), countries: strings(entities.countries), markets: strings(entities.markets), potentiallyAffectedCompanies: strings(entities.potentiallyAffectedCompanies) },
  };
}

function limitSection(value: ImpactSection | null, allowed: Set<string>): ImpactSection | null {
  if (!value) return null;
  const refs = (values: string[]) => values.filter((ref) => allowed.has(ref));
  const filteredEvidence = value.evidence.filter((entry) => allowed.has(entry.sourceRef));
  const filteredItems = value.items.map((entry) => ({ ...entry, sourceRefs: refs(entry.sourceRefs) }));
  if (!filteredEvidence.length) return { ...value, relevant: false, confidence: null, confidenceScore: 0, evidence: [], items: [] };
  return { ...value, evidence: filteredEvidence, items: filteredItems };
}

export function limitAnalysisSources(analysis: StoryAnalysis, allowedSources: string[]): StoryAnalysis {
  const allowed = new Set(allowedSources);
  const map = analysis.impactMap ? limitSection(analysis.impactMap, allowed) : null;
  const flow = analysis.followTheMoney ? limitSection(analysis.followTheMoney, allowed) : null;
  return {
    ...analysis,
    directImpact: limitSection(analysis.directImpact, allowed), indirectImpact: limitSection(analysis.indirectImpact, allowed), peopleImpact: limitSection(analysis.peopleImpact, allowed), geographicImpact: limitSection(analysis.geographicImpact, allowed),
    marketImpact: limitSection(analysis.marketImpact, allowed), companyImpact: limitSection(analysis.companyImpact, allowed), industryImpact: limitSection(analysis.industryImpact, allowed), supplyChainImpact: limitSection(analysis.supplyChainImpact, allowed),
    inflationImpact: limitSection(analysis.inflationImpact, allowed), interestRateImpact: limitSection(analysis.interestRateImpact, allowed), realEstateImpact: limitSection(analysis.realEstateImpact, allowed), energyImpact: limitSection(analysis.energyImpact, allowed), consumerImpact: limitSection(analysis.consumerImpact, allowed), assetImpact: limitSection(analysis.assetImpact, allowed),
    impactMap: map ? { ...map, steps: analysis.impactMap?.steps ?? [] } : null,
    followTheMoney: flow ? { ...flow, steps: analysis.followTheMoney?.steps ?? [], explanation: analysis.followTheMoney?.explanation ?? "" } : null,
    supplyChain: limitSection(analysis.supplyChain, allowed), companyRelationships: limitSection(analysis.companyRelationships, allowed),
  };
}
