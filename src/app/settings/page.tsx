import Link from "next/link";
import { db } from "@/src/lib/db";
import { PreferencesForm } from "@/src/components/preferences-form";

export default async function SettingsPage() {
  let preferences: { topics: string[]; companies: string[]; keywords: string[]; hiddenTopics: string[] } = { topics: ["Business", "Economy", "Technology", "AI", "Financial Markets"], companies: [], keywords: [], hiddenTopics: [] };
  try { const saved = await db.userPreference.findFirst(); if (saved) preferences = { topics: saved.topics as string[], companies: saved.companies as string[], keywords: saved.keywords as string[], hiddenTopics: saved.hiddenTopics as string[] }; } catch {}
  return <main className="content"><Link className="muted" href="/">← Dashboard</Link><div className="eyebrow" style={{ marginTop: 48 }}>Personalization</div><h1 style={{ maxWidth: 700 }}>Tune your signal.</h1><p className="lede">Follow the companies, markets, industries, and economic forces you care about. Preferences determine ordering, never the facts or uncertainty labels.</p><div className="panel" style={{ marginTop: 32 }}><PreferencesForm initialTopics={preferences.topics} initialCompanies={preferences.companies} initialKeywords={preferences.keywords} initialHiddenTopics={preferences.hiddenTopics} /></div></main>;
}
