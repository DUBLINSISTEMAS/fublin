import { describe, expect, it } from "vitest";
import { dayKey } from "./dates";
import { dayFromKey, isValidPeriodKey, periodClock, periodDatesLabel, periodFor, periodRange, periodShortLabel, productionLabel, productionOf, shiftPeriod } from "./quinzena";

const cuts = { firstCutDay: 5, secondCutDay: 20 };
/** O dono pode preferir chamar de 1ª a quinzena que começa no dia 20. */
const late = { firstCutDay: 20, secondCutDay: 5 };
const range = (key: string, c = cuts) => {
  const p = periodRange(key, c);
  return [dayKey(p.start), dayKey(p.end)];
};

describe("periodRange", () => {
  it("builds both halves from the cut days", () => {
    expect(range("2026-09-1")).toEqual(["2026-09-05", "2026-09-20"]);
    expect(range("2026-09-2")).toEqual(["2026-09-20", "2026-10-05"]);
    expect(range("2026-12-2")).toEqual(["2026-12-20", "2027-01-05"]);
  });
  it("accepts a first cut later than the second (20 → 4, then 5 → 19)", () => {
    expect(range("2026-09-1", late)).toEqual(["2026-09-20", "2026-10-05"]);
    expect(range("2026-09-2", late)).toEqual(["2026-10-05", "2026-10-20"]);
  });
  it("clamps cut days that do not exist in short months", () => {
    const p = periodRange("2026-02-2", { firstCutDay: 31, secondCutDay: 30 });
    expect(dayKey(p.start)).toBe("2026-03-30");
    expect(dayKey(p.end)).toBe("2026-03-31");
    expect(range("2026-02-1", { firstCutDay: 1, secondCutDay: 30 })).toEqual(["2026-02-01", "2026-02-28"]);
  });
  it("validates keys", () => {
    expect(isValidPeriodKey("2026-09-1")).toBe(true);
    expect(isValidPeriodKey("2026-13-1")).toBe(false);
    expect(isValidPeriodKey("2026-09-3")).toBe(false);
    expect(isValidPeriodKey(null)).toBe(false);
    expect(() => periodRange("nope", cuts)).toThrow();
  });
});

describe("periodFor", () => {
  it("finds the half that contains a date, across month boundaries", () => {
    expect(periodFor(dayFromKey("2026-09-05"), cuts).key).toBe("2026-09-1");
    expect(periodFor(dayFromKey("2026-09-19"), cuts).key).toBe("2026-09-1");
    expect(periodFor(dayFromKey("2026-09-20"), cuts).key).toBe("2026-09-2");
    expect(periodFor(dayFromKey("2026-10-04"), cuts).key).toBe("2026-09-2");
    expect(periodFor(dayFromKey("2026-10-01"), cuts).key).toBe("2026-09-2");
    expect(periodFor(new Date(2026, 8, 4, 23, 59), cuts).key).toBe("2026-08-2");
  });
  it("works when the first cut is the later day of the month", () => {
    expect(periodFor(dayFromKey("2026-09-25"), late).key).toBe("2026-09-1");
    expect(periodFor(dayFromKey("2026-10-04"), late).key).toBe("2026-09-1");
    expect(periodFor(dayFromKey("2026-10-10"), late).key).toBe("2026-09-2");
    expect(periodFor(dayFromKey("2026-10-19"), late).key).toBe("2026-09-2");
    expect(periodFor(dayFromKey("2026-10-20"), late).key).toBe("2026-10-1");
    expect(periodFor(dayFromKey("2026-09-03"), late).key).toBe("2026-08-1");
  });
});

describe("shiftPeriod / productionOf", () => {
  it("walks forwards and backwards through halves", () => {
    expect(shiftPeriod("2026-09-1", 1, cuts).key).toBe("2026-09-2");
    expect(shiftPeriod("2026-09-2", 1, cuts).key).toBe("2026-10-1");
    expect(shiftPeriod("2026-09-1", -1, cuts).key).toBe("2026-08-2");
    expect(shiftPeriod("2026-09-2", -3, cuts).key).toBe("2026-08-1");
    expect(shiftPeriod("2026-09-1", 4, cuts).key).toBe("2026-11-1");
  });
  it("pairs the two halves of a production", () => {
    expect(productionOf("2026-09-2", cuts).map((p) => p.key)).toEqual(["2026-09-1", "2026-09-2"]);
    expect(productionLabel(periodRange("2026-09-2", cuts))).toBe("Produção de setembro");
  });
});

describe("labels and clock", () => {
  it("describes the period in pt-BR", () => {
    expect(periodDatesLabel(periodRange("2026-09-1", cuts))).toBe("5 a 19 de set");
    expect(periodDatesLabel(periodRange("2026-09-2", cuts))).toBe("20 set a 4 out");
    expect(periodDatesLabel(periodRange("2026-09-1", late))).toBe("20 set a 4 out");
  });
  it("counts days gone and left", () => {
    const p = periodRange("2026-09-1", cuts);
    expect(periodClock(p, dayFromKey("2026-09-05"))).toEqual({ daysTotal: 15, daysGone: 0, daysLeft: 15, isCurrent: true, isPast: false });
    expect(periodClock(p, dayFromKey("2026-09-12"))).toMatchObject({ daysGone: 7, daysLeft: 8, isCurrent: true });
    expect(periodClock(p, dayFromKey("2026-09-19"))).toMatchObject({ daysLeft: 1, isCurrent: true });
    expect(periodClock(p, dayFromKey("2026-09-25"))).toMatchObject({ daysLeft: 0, isCurrent: false, isPast: true });
    expect(periodClock(p, dayFromKey("2026-09-01"))).toMatchObject({ daysGone: 0, daysLeft: 15, isCurrent: false, isPast: false });
  });
});

describe("periodShortLabel", () => {
  it("uses the month the period starts in", () => {
    expect(periodShortLabel(periodRange("2026-08-2", cuts))).toBe("2ª ago");
    expect(periodShortLabel(periodRange("2026-08-1", cuts))).toBe("1ª ago");
  });
});
