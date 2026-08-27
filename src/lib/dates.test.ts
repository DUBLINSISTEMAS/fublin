import { describe, expect, it } from "vitest";
import {
  dayBounds,
  dayKey,
  formatCountdown,
  formatRelativeDay,
  formatWhen,
  fromLocalInput,
  isReminderDue,
  isValidDayKey,
  isValidTime,
  reminderDueAt,
  shiftDayKey,
  toLocalInput,
} from "./dates";

const now = new Date(2026, 7, 27, 14, 0); // 27/08/2026 14:00 local

describe("dayKey / bounds", () => {
  it("formats local day key", () => {
    expect(dayKey(now)).toBe("2026-08-27");
  });
  it("computes day bounds inclusive", () => {
    const { start, end } = dayBounds("2026-08-27");
    expect(start.getHours()).toBe(0);
    expect(end.getHours()).toBe(23);
    expect(dayKey(start)).toBe("2026-08-27");
  });
  it("shifts day keys across month boundaries", () => {
    expect(shiftDayKey("2026-08-31", 1)).toBe("2026-09-01");
    expect(shiftDayKey("2026-01-01", -1)).toBe("2025-12-31");
  });
});

describe("validation", () => {
  it("accepts valid day keys and rejects garbage", () => {
    expect(isValidDayKey("2026-08-27")).toBe(true);
    expect(isValidDayKey("2026-13-01")).toBe(false);
    expect(isValidDayKey("2026-02-30")).toBe(false);
    expect(isValidDayKey("27/08/2026")).toBe(false);
    expect(isValidDayKey(null)).toBe(false);
  });
  it("validates HH:mm", () => {
    expect(isValidTime("09:30")).toBe(true);
    expect(isValidTime("24:00")).toBe(false);
    expect(isValidTime("9:30")).toBe(false);
  });
});

describe("local input round-trip", () => {
  it("combines day + time and back", () => {
    const d = fromLocalInput("2026-08-27", "09:15");
    expect(d.getHours()).toBe(9);
    expect(d.getMinutes()).toBe(15);
    expect(toLocalInput(d)).toEqual({ day: "2026-08-27", time: "09:15" });
  });
});

describe("relative formatting", () => {
  it("says Hoje / Amanhã / Ontem relative to now", () => {
    expect(formatRelativeDay(new Date(2026, 7, 27, 9), now)).toBe("Hoje");
    expect(formatRelativeDay(new Date(2026, 7, 28, 9), now)).toBe("Amanhã");
    expect(formatRelativeDay(new Date(2026, 7, 26, 9), now)).toBe("Ontem");
    expect(formatRelativeDay(new Date(2026, 8, 2, 9), now)).toBe("2 set");
  });
  it("formats when", () => {
    expect(formatWhen(new Date(2026, 7, 27, 16, 30), now)).toBe("Hoje às 16:30");
  });
  it("formats countdown", () => {
    expect(formatCountdown(new Date(2026, 7, 27, 14, 25), now)).toBe("em 25 min");
    expect(formatCountdown(new Date(2026, 7, 27, 16, 0), now)).toBe("em 2 h");
    expect(formatCountdown(new Date(2026, 7, 27, 13, 50), now)).toBe("há 10 min");
    expect(formatCountdown(now, now)).toBe("agora");
  });
});

describe("reminders", () => {
  const scheduled = new Date(2026, 7, 27, 15, 0);
  it("computes due instant", () => {
    expect(reminderDueAt(scheduled, 30).getMinutes()).toBe(30);
    expect(reminderDueAt(scheduled, 30).getHours()).toBe(14);
  });
  it("is due only inside [due, scheduled + grace]", () => {
    expect(isReminderDue(scheduled, 30, new Date(2026, 7, 27, 14, 29))).toBe(false);
    expect(isReminderDue(scheduled, 30, new Date(2026, 7, 27, 14, 30))).toBe(true);
    expect(isReminderDue(scheduled, 30, new Date(2026, 7, 27, 15, 10))).toBe(true);
    expect(isReminderDue(scheduled, 30, new Date(2026, 7, 27, 15, 16))).toBe(false);
  });
});
