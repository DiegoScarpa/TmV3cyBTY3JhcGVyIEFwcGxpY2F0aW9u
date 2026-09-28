import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";

export async function GET() { return NextResponse.json(await db.category.findMany({ orderBy: { sortOrder: "asc" } })); }
