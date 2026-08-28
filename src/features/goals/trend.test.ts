import { describe, expect, it } from "vitest";
import type { WeekPoint } from "./queries";
import { appointmentsTrend } from "./trend";

const week = (i: number, created: number): WeekPoint => ({ weekStart: `2026-0${1 + Math.floor(i / 4)}-0${1 + (i % 4)}` as WeekPoint["weekStart"], label: `s${i}`, created, done: 0 });

describe("appointmentsTrend", () => {
  it("says there is no history with fewer than two windows of finished weeks", () => {
    const trend = appointmentsTrend([week(0, 3), week(1, 4)]);
    expect(trend.direction).toBe("flat");
    expect(trend.headline).toBe("Ainda sem histórico");
  });

  it("ignores the current (last) week and reports growth", () => {
    const weeks = [week(0, 2), week(1, 2), week(2, 2), week(3, 5), week(4, 6), week(5, 7), week(6, 0)];
    const trend = appointmentsTrend(weeks);
    expect(trend.direction).toBe("up");
    expect(trend.recentAverage).toBe(6);
    expect(trend.previousAverage).toBe(2);
  });

  it("reports regression when the recent average drops", () => {
    const weeks = [week(0, 6), week(1, 6), week(2, 6), week(3, 2), week(4, 3), week(5, 1), week(6, 0)];
    expect(appointmentsTrend(weeks).direction).toBe("down");
  });

  it("treats small changes as stable", () => {
    const weeks = [week(0, 5), week(1, 5), week(2, 5), week(3, 5), week(4, 5), week(5, 6), week(6, 0)];
    expect(appointmentsTrend(weeks).direction).toBe("flat");
  });
});
