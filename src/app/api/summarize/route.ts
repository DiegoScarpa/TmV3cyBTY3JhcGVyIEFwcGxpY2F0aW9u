import { NextResponse } from "next/server";
import { refreshStory } from "@/src/lib/news/ingest";

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") { const expected = process.env.INGESTION_SECRET; const provided = request.headers.get("x-ingestion-secret"); if (!expected || provided !== expected) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
  const { storyId } = await request.json();
  if (!storyId) return NextResponse.json({ error: "storyId is required" }, { status: 400 });
  try { await refreshStory(storyId); return NextResponse.json({ ok: true, storyId }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Summarization failed" }, { status: 500 }); }
}
