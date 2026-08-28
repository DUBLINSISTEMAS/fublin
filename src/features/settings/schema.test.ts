import { describe, expect, it } from "vitest";
import { cutsFromRange, goalSettingsSchema, periodFormSchema, rangeFromCuts } from "./schema";

describe("period form", () => {
  it("maps 'do dia X ao dia Y' to cuts in any order", () => {
    expect(cutsFromRange(5, 19)).toEqual({ firstCutDay: 5, secondCutDay: 20 });
    expect(cutsFromRange(20, 4)).toEqual({ firstCutDay: 20, secondCutDay: 5 });
    expect(cutsFromRange(16, 31)).toEqual({ firstCutDay: 16, secondCutDay: 1 });
    expect(rangeFromCuts({ firstCutDay: 20, secondCutDay: 5 })).toEqual({ firstStart: 20, firstEnd: 4 });
    expect(rangeFromCuts({ firstCutDay: 16, secondCutDay: 1 })).toEqual({ firstStart: 16, firstEnd: 31 });
  });
  it("validates the form and rejects an empty second half", () => {
    expect(periodFormSchema.parse({ firstStart: "20", firstEnd: "4" })).toEqual({ firstCutDay: 20, secondCutDay: 5 });
    expect(periodFormSchema.safeParse({ firstStart: "5", firstEnd: "5" }).success).toBe(false);
    expect(periodFormSchema.safeParse({ firstStart: "5", firstEnd: "4" }).success).toBe(false);
    expect(periodFormSchema.safeParse({ firstStart: "0", firstEnd: "4" }).success).toBe(false);
  });
});

describe("goal settings", () => {
  it("upgrades the old single default to both halves", () => {
    expect(goalSettingsSchema.parse({ defaultTargetCents: 70000000 })).toEqual({ defaultFirstCents: 70000000, defaultSecondCents: 70000000, appointmentsPerWeek: null });
    expect(goalSettingsSchema.parse({ defaultFirstCents: 1, defaultSecondCents: 2, appointmentsPerWeek: 10 })).toEqual({ defaultFirstCents: 1, defaultSecondCents: 2, appointmentsPerWeek: 10 });
  });
});
