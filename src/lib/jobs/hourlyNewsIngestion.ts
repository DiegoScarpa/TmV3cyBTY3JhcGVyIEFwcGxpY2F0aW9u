import { ingestNews } from "@/src/lib/news/ingest";

export async function hourlyNewsIngestion() {
  return ingestNews({ trigger: "hourlyNewsIngestion" });
}
