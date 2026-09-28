import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";

export async function GET(request: Request) { const query = new URL(request.url).searchParams.get("q")?.trim() ?? ""; if (!query) return NextResponse.json([]); const stories = await db.story.findMany({ where: { OR: [{ headline: { contains: query, mode: "insensitive" } }, { summary: { contains: query, mode: "insensitive" } }, { whyItMatters: { contains: query, mode: "insensitive" } }, { primaryCategory: { name: { contains: query, mode: "insensitive" } } }, { articles: { some: { title: { contains: query, mode: "insensitive" } } } }] }, take: 50, orderBy: { lastUpdatedAt: "desc" }, include: { primaryCategory: true, storySources: { include: { source: true } } } }); return NextResponse.json(stories); }
