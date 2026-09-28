export type ImpactConfidence = "High" | "Medium" | "Low";

export type ImpactItem = { subject: string; effect: string; mechanism: string; confidence: ImpactConfidence; sourceRefs: string[] };
export type GeographicImpact = { location: string; effect: string; confidence: ImpactConfidence; sourceRefs: string[] };
export type AssetImpact = { asset: string; whyItCouldBeAffected: string; transmissionMechanism: string; direction: string; confidence: ImpactConfidence; sourceRefs: string[] };
export type SupplyChainItem = { stage: string; entity: string; effect: string; confidence: ImpactConfidence; sourceRefs: string[] };
export type CompanyRelationship = { company: string; relationship: string; effect: string; confidence: ImpactConfidence; sourceRefs: string[] };
export type MoneyFlow = { enabled: boolean; steps: string[]; explanation: string; confidence: ImpactConfidence; sourceRefs: string[] };
export type EntityDetails = { companies: string[]; industries: string[]; countries: string[]; markets: string[]; potentiallyAffectedCompanies: string[] };

export type StoryAnalysis = {
  whatHappened: string;
  directImpact: ImpactItem[];
  indirectImpact: ImpactItem[];
  peopleImpact: ImpactItem[];
  geographicImpact: GeographicImpact[];
  assetImpact: AssetImpact[];
  impactMap: string[];
  followTheMoney: MoneyFlow;
  supplyChain: SupplyChainItem[];
  companyRelationships: CompanyRelationship[];
  entityDetails: EntityDetails;
};

export const EMPTY_ANALYSIS: StoryAnalysis = {
  whatHappened: "Insufficient publicly accessible information is available for a detailed analysis.",
  directImpact: [], indirectImpact: [], peopleImpact: [], geographicImpact: [], assetImpact: [], impactMap: [],
  followTheMoney: { enabled: false, steps: [], explanation: "No reliable financial flow can be determined from the available sources.", confidence: "Low", sourceRefs: [] },
  supplyChain: [], companyRelationships: [],
  entityDetails: { companies: [], industries: [], countries: [], markets: [], potentiallyAffectedCompanies: [] },
};

function strings(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; }
function confidence(value: unknown): ImpactConfidence { return value === "High" || value === "Medium" || value === "Low" ? value : "Low"; }
function item(value: unknown): ImpactItem | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  return { subject: typeof source.subject === "string" ? source.subject : "Unknown subject", effect: typeof source.effect === "string" ? source.effect : "Insufficient information to determine the effect.", mechanism: typeof source.mechanism === "string" ? source.mechanism : "", confidence: confidence(source.confidence), sourceRefs: strings(source.sourceRefs) };
}
function items(value: unknown) { return Array.isArray(value) ? value.map(item).filter((entry): entry is ImpactItem => Boolean(entry)) : []; }

export function normalizeStoryAnalysis(value: unknown): StoryAnalysis | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  const flow = source.followTheMoney && typeof source.followTheMoney === "object" ? source.followTheMoney as Record<string, unknown> : {};
  const entities = source.entityDetails && typeof source.entityDetails === "object" ? source.entityDetails as Record<string, unknown> : {};
  const geographic = Array.isArray(source.geographicImpact) ? source.geographicImpact.map((entry) => {
    if (!entry || typeof entry !== "object") return null;
    const row = entry as Record<string, unknown>;
    return { location: typeof row.location === "string" ? row.location : "Unknown location", effect: typeof row.effect === "string" ? row.effect : "Insufficient information to determine the effect.", confidence: confidence(row.confidence), sourceRefs: strings(row.sourceRefs) };
  }).filter((entry): entry is GeographicImpact => Boolean(entry)) : [];
  const assets = Array.isArray(source.assetImpact) ? source.assetImpact.map((entry) => {
    if (!entry || typeof entry !== "object") return null;
    const row = entry as Record<string, unknown>;
    return { asset: typeof row.asset === "string" ? row.asset : "Unknown asset", whyItCouldBeAffected: typeof row.whyItCouldBeAffected === "string" ? row.whyItCouldBeAffected : "Insufficient information to determine the effect.", transmissionMechanism: typeof row.transmissionMechanism === "string" ? row.transmissionMechanism : "", direction: typeof row.direction === "string" ? row.direction : "Unclear", confidence: confidence(row.confidence), sourceRefs: strings(row.sourceRefs) };
  }).filter((entry): entry is AssetImpact => Boolean(entry)) : [];
  const supplyChain = Array.isArray(source.supplyChain) ? source.supplyChain.map((entry) => {
    if (!entry || typeof entry !== "object") return null;
    const row = entry as Record<string, unknown>;
    return { stage: typeof row.stage === "string" ? row.stage : "Unknown stage", entity: typeof row.entity === "string" ? row.entity : "Unknown entity", effect: typeof row.effect === "string" ? row.effect : "Insufficient information to determine the effect.", confidence: confidence(row.confidence), sourceRefs: strings(row.sourceRefs) };
  }).filter((entry): entry is SupplyChainItem => Boolean(entry)) : [];
  const relationships = Array.isArray(source.companyRelationships) ? source.companyRelationships.map((entry) => {
    if (!entry || typeof entry !== "object") return null;
    const row = entry as Record<string, unknown>;
    return { company: typeof row.company === "string" ? row.company : "Unknown company", relationship: typeof row.relationship === "string" ? row.relationship : "", effect: typeof row.effect === "string" ? row.effect : "Insufficient information to determine the effect.", confidence: confidence(row.confidence), sourceRefs: strings(row.sourceRefs) };
  }).filter((entry): entry is CompanyRelationship => Boolean(entry)) : [];
  return {
    whatHappened: typeof source.whatHappened === "string" ? source.whatHappened : EMPTY_ANALYSIS.whatHappened,
    directImpact: items(source.directImpact), indirectImpact: items(source.indirectImpact), peopleImpact: items(source.peopleImpact), geographicImpact: geographic, assetImpact: assets,
    impactMap: strings(source.impactMap),
    followTheMoney: { enabled: flow.enabled === true, steps: strings(flow.steps), explanation: typeof flow.explanation === "string" ? flow.explanation : EMPTY_ANALYSIS.followTheMoney.explanation, confidence: confidence(flow.confidence), sourceRefs: strings(flow.sourceRefs) },
    supplyChain, companyRelationships: relationships,
    entityDetails: { companies: strings(entities.companies), industries: strings(entities.industries), countries: strings(entities.countries), markets: strings(entities.markets), potentiallyAffectedCompanies: strings(entities.potentiallyAffectedCompanies) },
  };
}

export function limitAnalysisSources(analysis: StoryAnalysis, allowedSources: string[]): StoryAnalysis {
  const allowed = new Set(allowedSources);
  const refs = (values: string[]) => values.filter((value) => allowed.has(value));
  return {
    ...analysis,
    directImpact: analysis.directImpact.map((item) => ({ ...item, sourceRefs: refs(item.sourceRefs) })),
    indirectImpact: analysis.indirectImpact.map((item) => ({ ...item, sourceRefs: refs(item.sourceRefs) })),
    peopleImpact: analysis.peopleImpact.map((item) => ({ ...item, sourceRefs: refs(item.sourceRefs) })),
    geographicImpact: analysis.geographicImpact.map((item) => ({ ...item, sourceRefs: refs(item.sourceRefs) })),
    assetImpact: analysis.assetImpact.map((item) => ({ ...item, sourceRefs: refs(item.sourceRefs) })),
    followTheMoney: { ...analysis.followTheMoney, sourceRefs: refs(analysis.followTheMoney.sourceRefs) },
    supplyChain: analysis.supplyChain.map((item) => ({ ...item, sourceRefs: refs(item.sourceRefs) })),
    companyRelationships: analysis.companyRelationships.map((item) => ({ ...item, sourceRefs: refs(item.sourceRefs) })),
  };
}
