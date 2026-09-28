import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) { const { id } = await params; const story = await db.story.findUnique({ where: { id }, include: { primaryCategory: true, analysis: true, storySources: { include: { source: true, article: true } } } }); return story ? NextResponse.json(story) : NextResponse.json({ error: "Not found" }, { status: 404 }); }
