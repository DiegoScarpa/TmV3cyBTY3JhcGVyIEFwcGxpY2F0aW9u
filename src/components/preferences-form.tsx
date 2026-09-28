"use client";

import { useState } from "react";

export function PreferencesForm({ initialTopics }: { initialTopics: string[] }) {
  const [topics, setTopics] = useState(initialTopics.join(", ")); const [status, setStatus] = useState("");
  return <form className="form-grid" onSubmit={async (event) => { event.preventDefault(); setStatus("Saving..."); const response = await fetch("/api/preferences", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ topics: topics.split(",").map((item) => item.trim()).filter(Boolean) }) }); setStatus(response.ok ? "Saved" : "Could not save"); }}><label>Topics you follow<input value={topics} onChange={(event) => setTopics(event.target.value)} placeholder="AI, Business, Economy" /></label><label>Companies, people, or keywords<textarea name="keywords" placeholder="OpenAI, semiconductor supply chains, interest rates" rows={4} /></label><button className="button primary" type="submit">Save preferences</button><span className="muted">{status}</span></form>;
}
