import Link from "next/link";
import { db } from "@/src/lib/db";
import { PreferencesForm } from "@/src/components/preferences-form";

export default async function SettingsPage() {
  let topics = ["AI", "Business", "Economy", "Technology", "Startups", "Financial Markets"];
  try { const preference = await db.userPreference.findFirst(); if (preference) topics = preference.topics as string[]; } catch {}
  return <main className="content"><Link className="muted" href="/">← Dashboard</Link><div className="eyebrow" style={{ marginTop: 48 }}>Personalization</div><h1 style={{ maxWidth: 700 }}>Tune your signal.</h1><p className="lede">Your preferences decide what appears first. They do not change source selection, factual wording, or uncertainty labels.</p><div className="panel" style={{ marginTop: 32 }}><PreferencesForm initialTopics={topics} /></div></main>;
}
