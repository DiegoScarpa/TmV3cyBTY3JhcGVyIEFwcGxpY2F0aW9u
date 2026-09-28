import { describe, expect, it } from "vitest";
import { createSchedule, enumerateEligibleDates, getDateRange } from "@/scripts/generate-contribution-history";

describe("contribution history schedule", () => {
  it("uses the current partial month plus the preceding calendar months", () => {
    const today = new Date(2026, 8, 28);
    const { start, end } = getDateRange(today, 3);

    expect(start).toEqual(new Date(2026, 6, 1));
    expect(end).toEqual(new Date(2026, 8, 28));
  });

  it("excludes Sundays from the eligible date list", () => {
    const dates = enumerateEligibleDates(new Date(2026, 6, 1), new Date(2026, 8, 28));

    expect(dates.length).toBeGreaterThan(0);
    expect(dates.every((date) => date.getDay() !== 0)).toBe(true);
  });

  it("allocates every requested commit across varied Monday-Saturday activity", () => {
    const schedule = createSchedule(20, 3, new Date(2026, 8, 28), () => 0);
    const total = schedule.reduce((sum, day) => sum + day.commitCount, 0);

    expect(total).toBe(20);
    expect(schedule.length).toBeGreaterThan(1);
    expect(schedule.every((day) => day.date.getDay() !== 0)).toBe(true);
    expect(new Set(schedule.map((day) => day.commitCount)).size).toBeGreaterThan(1);
  });
});
