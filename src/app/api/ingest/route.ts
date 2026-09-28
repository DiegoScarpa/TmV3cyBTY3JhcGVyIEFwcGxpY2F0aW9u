import { NextResponse } from "next/server";
import { ingestNews } from "@/src/lib/news/ingest";
import { isIngestionAuthorized } from "@/src/lib/jobs/auth";

export async function POST(request: Request) {
  if (!isIngestionAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { return NextResponse.json(await ingestNews()); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Ingestion failed" }, { status: 500 }); }
}

export async function GET(request: Request) {
  if (!isIngestionAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { return NextResponse.json(await ingestNews({ trigger: "vercel-cron" })); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Ingestion failed" }, { status: 500 }); }
}
