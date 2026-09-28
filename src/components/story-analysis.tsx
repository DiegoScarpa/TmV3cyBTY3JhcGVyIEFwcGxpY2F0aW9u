import { isMeaningfulImpact, normalizeStoryAnalysis, type ImpactSection, type StoryAnalysis } from "@/src/lib/analysis";

function Confidence({ value }: { value: string | null }) { return value ? <span className={`analysis-confidence confidence-${value.toLowerCase()}`}>{value} confidence</span> : null; }
function Evidence({ section }: { section: ImpactSection }) { return <div className="analysis-evidence">{section.evidence.map((entry) => <div className="analysis-evidence-item" key={`${entry.sourceRef}-${entry.passage}`}><strong>{entry.sourceRef}</strong><span>“{entry.passage}”</span><small>{entry.relationship}</small></div>)}</div>; }

function ImpactList({ section }: { section: ImpactSection }) {
  if (!isMeaningfulImpact(section)) return null;
  return <div className="analysis-list">{section.items.map((item) => <div className="analysis-item" key={`${item.subject}-${item.effect}`}><div className="analysis-item-heading"><strong>{item.subject}</strong><Confidence value={item.confidence} /></div><p>{item.effect}</p>{item.mechanism && <p className="analysis-mechanism"><strong>Mechanism:</strong> {item.mechanism}{item.direction ? ` · Direction: ${item.direction}` : ""}</p>}</div>)}<Evidence section={section} /></div>;
}

function OptionalImpact({ title, section }: { title: string; section: ImpactSection | null }) {
  if (!section || !isMeaningfulImpact(section)) return null;
  return <section className="story-section"><div className="analysis-title-row"><h2>{title}</h2><Confidence value={section.confidence} /></div><ImpactList section={section} /></section>;
}

function EntityDetails({ analysis }: { analysis: StoryAnalysis }) {
  const groups = Object.entries({ Companies: analysis.entityDetails.companies, Industries: analysis.entityDetails.industries, Countries: analysis.entityDetails.countries, Markets: analysis.entityDetails.markets, "Potentially affected companies": analysis.entityDetails.potentiallyAffectedCompanies }).filter(([, values]) => values.length > 0);
  if (!groups.length) return null;
  return <section className="story-section"><h2>Business intelligence</h2><div className="entity-grid">{groups.map(([label, values]) => <div className="entity-box" key={label}><div className="eyebrow">{label}</div><div>{values.join(" · ")}</div></div>)}</div></section>;
}

function MapSection({ analysis }: { analysis: StoryAnalysis }) {
  if (!analysis.impactMap || !isMeaningfulImpact(analysis.impactMap) || analysis.impactMap.steps.length < 2) return null;
  return <section className="story-section"><h2>Impact map</h2><div className="impact-map">{analysis.impactMap.steps.map((step, index) => <span key={`${step}-${index}`}>{step}{index < analysis.impactMap!.steps.length - 1 && <b>↓</b>}</span>)}</div><Evidence section={analysis.impactMap} /></section>;
}

function MoneyFlowSection({ analysis }: { analysis: StoryAnalysis }) {
  const flow = analysis.followTheMoney;
  if (!flow || !isMeaningfulImpact(flow) || flow.steps.length < 2) return null;
  return <section className="story-section"><h2>Follow the money</h2><div className="impact-map">{flow.steps.map((step, index) => <span key={`${step}-${index}`}>{step}{index < flow.steps.length - 1 && <b>↓</b>}</span>)}</div>{flow.explanation && <p>{flow.explanation}</p>}<Evidence section={flow} /></section>;
}

export function StoryAnalysisSections({ value }: { value: unknown }) {
  const analysis = normalizeStoryAnalysis(value);
  if (!analysis) return null;
  return <>
    {analysis.whatHappened && <section className="story-section"><h2>What happened</h2>{analysis.whatHappened.split(/\n\s*\n/).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</section>}
    <OptionalImpact title="Direct impact" section={analysis.directImpact} />
    <OptionalImpact title="Indirect impact" section={analysis.indirectImpact} />
    <OptionalImpact title="Impact on people" section={analysis.peopleImpact} />
    <OptionalImpact title="Geographic impact" section={analysis.geographicImpact} />
    <OptionalImpact title="Market impact" section={analysis.marketImpact} />
    <OptionalImpact title="Company impact" section={analysis.companyImpact} />
    <OptionalImpact title="Industry impact" section={analysis.industryImpact} />
    <OptionalImpact title="Supply chain impact" section={analysis.supplyChainImpact ?? analysis.supplyChain} />
    <OptionalImpact title="Inflation impact" section={analysis.inflationImpact} />
    <OptionalImpact title="Interest-rate impact" section={analysis.interestRateImpact} />
    <OptionalImpact title="Real-estate impact" section={analysis.realEstateImpact} />
    <OptionalImpact title="Energy impact" section={analysis.energyImpact} />
    <OptionalImpact title="Consumer impact" section={analysis.consumerImpact} />
    <OptionalImpact title="Asset impact" section={analysis.assetImpact} />
    <EntityDetails analysis={analysis} />
    <MapSection analysis={analysis} />
    <MoneyFlowSection analysis={analysis} />
    <OptionalImpact title="Company relationships" section={analysis.companyRelationships} />
  </>;
}
