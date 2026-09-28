import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) { const { id } = await params; const article = await db.article.findUnique({ where: { id }, include: { source: true, story: true, category: true } }); return article ? NextResponse.json(article) : NextResponse.json({ error: "Not found" }, { status: 404 }); }
