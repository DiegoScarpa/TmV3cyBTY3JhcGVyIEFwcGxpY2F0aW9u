"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function IngestButton() {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<string>("");
  async function run() {
    if (running) return;
    setRunning(true);
    setStatus("Refreshing feeds…");
    try {
      const response = await fetch("/api/ingest", { method: "POST", cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Ingestion failed");
      setStatus(body.skipped ? "Another refresh is already running" : `${body.articlesProcessed ?? 0} new articles · feed refreshed`);
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Ingestion failed");
    } finally {
      setRunning(false);
    }
  }
  return <button className="button primary" disabled={running} onClick={run}>{running ? status : (status || "Refresh news")}</button>;
}
