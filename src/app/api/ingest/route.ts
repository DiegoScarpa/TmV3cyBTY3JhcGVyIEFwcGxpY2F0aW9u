import { NextResponse } from "next/server";
import { ingestNews } from "@/src/lib/news/ingest";
import { isIngestionAuthorized } from "@/src/lib/jobs/auth";
import { noStoreHeaders } from "@/src/lib/news/cache";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export async function POST(request: Request) {
  if (!isIngestionAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { return NextResponse.json(await ingestNews(), { headers: noStoreHeaders }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Ingestion failed" }, { status: 500, headers: noStoreHeaders }); }
}

export async function GET(request: Request) {
  if (!isIngestionAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { return NextResponse.json(await ingestNews({ trigger: "vercel-cron" }), { headers: noStoreHeaders }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Ingestion failed" }, { status: 500, headers: noStoreHeaders }); }
}
