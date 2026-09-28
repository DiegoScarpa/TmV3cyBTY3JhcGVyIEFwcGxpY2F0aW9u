"use client";

import { useState } from "react";

export function IngestButton() {
  const [status, setStatus] = useState<string>("");
  return <button className="button primary" onClick={async () => { setStatus("Fetching..."); const response = await fetch("/api/ingest", { method: "POST" }); const body = await response.json(); setStatus(response.ok ? `${body.articlesUpserted ?? 0} new articles` : (body.error ?? "Ingestion failed")); }}>{status || "Run ingestion"}</button>;
}
