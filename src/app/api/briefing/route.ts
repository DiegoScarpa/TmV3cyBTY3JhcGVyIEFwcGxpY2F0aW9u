import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";

export async function GET() { const stories = await db.story.findMany({ take: 10, orderBy: [{ relevanceScore: "desc" }, { importanceScore: "desc" }], include: { primaryCategory: true, storySources: { include: { source: true } } } }); return NextResponse.json({ date: new Date().toISOString(), stories }); }
