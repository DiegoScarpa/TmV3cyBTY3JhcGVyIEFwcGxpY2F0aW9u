"use client";

import { useState } from "react";
import { TOPIC_GROUPS } from "@/src/lib/news/topic-taxonomy";

type PreferencesFormProps = { initialTopics: string[]; initialCompanies?: string[]; initialKeywords?: string[]; initialHiddenTopics?: string[] };

export function PreferencesForm({ initialTopics, initialCompanies = [], initialKeywords = [], initialHiddenTopics = [] }: PreferencesFormProps) {
  const [topics, setTopics] = useState(initialTopics);
  const [customTopics, setCustomTopics] = useState("");
  const [companies, setCompanies] = useState(initialCompanies.join(", "));
  const [keywords, setKeywords] = useState(initialKeywords.join(", "));
  const [hiddenTopics, setHiddenTopics] = useState(initialHiddenTopics.join(", "));
  const [status, setStatus] = useState("");
  const selected = new Set(topics.map((topic) => topic.toLowerCase()));
  function toggleTopic(topic: string) { setTopics((current) => current.some((item) => item.toLowerCase() === topic.toLowerCase()) ? current.filter((item) => item.toLowerCase() !== topic.toLowerCase()) : [...current, topic]); }
  async function save(event: React.FormEvent) {
    event.preventDefault(); setStatus("Saving...");
    const custom = customTopics.split(",").map((item) => item.trim()).filter(Boolean);
    const response = await fetch("/api/preferences", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ topics: [...new Set([...topics, ...custom])], companies: companies.split(",").map((item) => item.trim()).filter(Boolean), keywords: keywords.split(",").map((item) => item.trim()).filter(Boolean), hiddenTopics: hiddenTopics.split(",").map((item) => item.trim()).filter(Boolean) }) });
    setStatus(response.ok ? "Saved" : "Could not save");
  }
  return <form className="form-grid" onSubmit={save}><div><label>Follow topics</label><div className="preference-topic-grid">{TOPIC_GROUPS.filter((group) => group.slug !== "other").map((group) => <div className="preference-group" key={group.slug}><strong>{group.name}</strong>{group.topics.map((topic) => <label className="preference-check" key={topic}><input type="checkbox" checked={selected.has(topic.toLowerCase())} onChange={() => toggleTopic(topic)} />{topic}</label>)}</div>)}</div></div><label>Custom topics<input value={customTopics} onChange={(event) => setCustomTopics(event.target.value)} placeholder="Semiconductor capex, Utah housing" /></label><label>Companies, funds, or people<input value={companies} onChange={(event) => setCompanies(event.target.value)} placeholder="NVIDIA, BlackRock, Jerome Powell" /></label><label>Keywords<textarea value={keywords} onChange={(event) => setKeywords(event.target.value)} placeholder="interest rates, supply chain, mortgage rates" rows={3} /></label><label>Topics to hide<input value={hiddenTopics} onChange={(event) => setHiddenTopics(event.target.value)} placeholder="Entertainment, Celebrity" /></label><button className="button primary" type="submit">Save preferences</button><span className="muted">{status}</span></form>;
}
