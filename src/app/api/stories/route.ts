import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";

export async function GET(request: Request) {
  const url = new URL(request.url); const category = url.searchParams.get("category");
  const stories = await db.story.findMany({ where: category ? { primaryCategory: { slug: category } } : undefined, take: 50, orderBy: [{ importanceScore: "desc" }, { lastUpdatedAt: "desc" }], include: { primaryCategory: true, storySources: { include: { source: true, article: true } } } });
  return NextResponse.json(stories);
}
