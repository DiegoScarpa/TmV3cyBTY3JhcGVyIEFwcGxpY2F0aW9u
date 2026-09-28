import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";
import { TOPIC_GROUPS } from "@/src/lib/news/topic-taxonomy";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const topics = await db.topic.findMany({ orderBy: [{ group: "asc" }, { sortOrder: "asc" }] });
    if (topics.length) return NextResponse.json(topics);
  } catch {
    // The static taxonomy keeps navigation useful before the first migration/seed.
  }
  return NextResponse.json(TOPIC_GROUPS);
}
