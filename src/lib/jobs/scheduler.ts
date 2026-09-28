import cron from "node-cron";
import { db } from "@/src/lib/db";
import { getIngestionIntervalMinutes } from "./config";
import { hourlyNewsIngestion } from "./hourlyNewsIngestion";

async function isDue() {
  const lastRun = await db.ingestionRun.findFirst({ orderBy: { startedAt: "desc" } });
  if (!lastRun) return true;
  if (lastRun.status === "RUNNING") return false;
  const completedAt = lastRun.completedAt ?? lastRun.startedAt;
  return Date.now() >= completedAt.getTime() + getIngestionIntervalMinutes() * 60_000;
}

export async function startHourlyNewsIngestionScheduler() {
  console.log(`[hourlyNewsIngestion] scheduler enabled: every ${getIngestionIntervalMinutes()} minutes`);
  const initial = await hourlyNewsIngestion();
  console.log(`[hourlyNewsIngestion] initial run: ${initial.skipped ? "skipped because another run is active" : initial.status}`);
  const task = cron.schedule("* * * * *", async () => {
    try {
      if (await isDue()) {
        const result = await hourlyNewsIngestion();
        console.log(`[hourlyNewsIngestion] scheduled run: ${result.skipped ? "skipped because another run is active" : result.status}`);
      }
    } catch (error) {
      console.error("[hourlyNewsIngestion] scheduler tick failed", error);
    }
  }, { noOverlap: true });
  return task;
}
