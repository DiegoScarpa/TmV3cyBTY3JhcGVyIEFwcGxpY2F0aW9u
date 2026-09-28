import "dotenv/config";
import { startHourlyNewsIngestionScheduler } from "@/src/lib/jobs/scheduler";

startHourlyNewsIngestionScheduler().catch((error) => {
  console.error("[hourlyNewsIngestion] failed to start", error);
  process.exitCode = 1;
});
