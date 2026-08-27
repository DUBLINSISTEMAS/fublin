import { describe, expect, it } from "vitest";
import { dayKey } from "./dates";
import { resolvePeriodFilter } from "./period-filter";

const cuts = { firstCutDay: 5, secondCutDay: 20 };
const now = new Date(2026, 8, 10, 12, 0); // 10/09/2026 → 1ª quinzena de setembro

describe("resolvePeriodFilter", () => {
  it("defaults to the current quinzena", () => {
    const r = resolvePeriodFilter({}, cuts, now);
    expect(r.mode).toBe("quinzena");
    expect(r.key).toBe("2026-09-1");
    expect(r.label).toBe("1ª quinzena · 5 a 19 de set");
    expect([dayKey(r.range!.start), dayKey(r.range!.end)]).toEqual(["2026-09-05", "2026-09-20"]);
    expect(r.previousKey).toBe("2026-08-2");
    expect(r.nextKey).toBe("2026-09-2");
    expect(r.isCurrent).toBe(true);
    expect(r.query).toEqual({});
  });

  it("navigates to another quinzena and keeps it in the query", () => {
    const r = resolvePeriodFilter({ q: "2026-08-2" }, cuts, now);
    expect(r.key).toBe("2026-08-2");
    expect(r.isCurrent).toBe(false);
    expect(r.query).toEqual({ q: "2026-08-2" });
    expect(resolvePeriodFilter({ q: "nope" }, cuts, now).key).toBe("2026-09-1");
  });

  it("supports month and all-time modes", () => {
    const month = resolvePeriodFilter({ periodo: "mes", mes: "2026-07" }, cuts, now);
    expect(month.label).toBe("Julho de 2026");
    expect([dayKey(month.range!.start), dayKey(month.range!.end)]).toEqual(["2026-07-01", "2026-08-01"]);
    expect(month.query).toEqual({ periodo: "mes", mes: "2026-07" });
    expect(resolvePeriodFilter({ periodo: "mes" }, cuts, now).query).toEqual({ periodo: "mes" });

    const all = resolvePeriodFilter({ periodo: "todos" }, cuts, now);
    expect(all.range).toBeUndefined();
    expect(all.query).toEqual({ periodo: "todos" });
    expect(resolvePeriodFilter({ periodo: "x" }, cuts, now).mode).toBe("quinzena");
  });
});
