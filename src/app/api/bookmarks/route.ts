import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";

async function demoUser() { return db.user.upsert({ where: { email: "demo@news-intelligence.local" }, update: {}, create: { email: "demo@news-intelligence.local", name: "Demo Reader" } }); }
export async function GET() { const user = await demoUser(); return NextResponse.json(await db.bookmark.findMany({ where: { userId: user.id }, include: { story: true }, orderBy: { createdAt: "desc" } })); }
export async function POST(request: Request) { const { storyId } = await request.json(); const user = await demoUser(); const existing = await db.bookmark.findUnique({ where: { userId_storyId: { userId: user.id, storyId } } }); if (existing) { await db.bookmark.delete({ where: { id: existing.id } }); return NextResponse.json({ saved: false }); } const bookmark = await db.bookmark.create({ data: { userId: user.id, storyId } }); return NextResponse.json({ saved: true, bookmark }); }
