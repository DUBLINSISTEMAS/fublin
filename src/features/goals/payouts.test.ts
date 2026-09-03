import { describe, expect, it } from "vitest";
import { toIso } from "@/lib/dates";
import { periodClock, periodRange, type PeriodKey } from "@/lib/quinzena";
import { buildPayoutRows } from "./payouts";
import { summarize, type ClosedDeal, type PeriodProgress } from "./queries";

const cuts = { firstCutDay: 5, secondCutDay: 20 };
const now = new Date(2026, 8, 12, 10, 0); // 12/09/2026 → 1ª quinzena de setembro (5–19)
const RATE = 0.4;

function progress(key: PeriodKey, deals: ClosedDeal[]): PeriodProgress {
  const period = periodRange(key, cuts);
  return summarize(period, periodClock(period, now), deals, null, true);
}

const deal = (id: string, creditCents: number | null, ratePercent: number | null = null): ClosedDeal => ({ id, name: `Cliente ${id}`, creditCents, ratePercent, closedAt: "" });

describe("buildPayoutRows", () => {
  it("maps a period to a row with title, inclusive end date, totals and commission", () => {
    const rows = buildPayoutRows([progress("2026-09-1", [deal("a", 30000000), deal("b", 20000000)])], RATE, now);

    expect(rows).toHaveLength(1);
    const [row] = rows;
    expect(row.periodKey).toBe("2026-09-1");
    expect(row.title).toBe("1ª quinzena");
    expect(row.start).toBe(toIso(new Date(2026, 8, 5)));
    expect(row.end).toBe(toIso(new Date(2026, 8, 19)));
    expect(row.closedCount).toBe(2);
    expect(row.salesCents).toBe(50000000);
    expect(row.commissionCents).toBe(200000); // 0,4% de R$ 500.000,00 = R$ 2.000,00
    expect(row.status).toBe("Em andamento");
  });

  it("marks past periods as closed and upcoming ones as future, keeping the input order", () => {
    const periods = [progress("2026-09-2", []), progress("2026-09-1", []), progress("2026-08-2", [deal("x", 100000)])];

    const rows = buildPayoutRows(periods, RATE, now);

    expect(rows.map((r) => r.periodKey)).toEqual(["2026-09-2", "2026-09-1", "2026-08-2"]);
    expect(rows.map((r) => r.status)).toEqual(["Futura", "Em andamento", "Fechada"]);
    expect(rows[2].title).toBe("2ª quinzena");
    expect(rows[2].start).toBe(toIso(new Date(2026, 7, 20)));
    expect(rows[2].end).toBe(toIso(new Date(2026, 8, 4))); // 2ª de agosto vai até a véspera do 1º corte de setembro
    expect(rows[2].commissionCents).toBe(400); // 0,4% de R$ 1.000,00
  });

  it("counts deals without a credit value but not their money, and rounds the commission", () => {
    const rows = buildPayoutRows([progress("2026-09-1", [deal("a", null), deal("b", 12345)])], RATE, now);

    expect(rows[0].closedCount).toBe(2);
    expect(rows[0].salesCents).toBe(12345);
    expect(rows[0].commissionCents).toBe(49); // 12345 × 0,4% = 49,38
  });

  it("pays each deal by its own rate when the owner set one", () => {
    const rows = buildPayoutRows([progress("2026-09-1", [deal("a", 10_000_000, 0.5), deal("b", 10_000_000)])], RATE, now);

    expect(rows[0].salesCents).toBe(20_000_000);
    expect(rows[0].commissionCents).toBe(50_000 + 40_000); // 0,5% de R$ 100 mil + 0,4% de R$ 100 mil
  });

  it("returns no rows for no periods", () => {
    expect(buildPayoutRows([], RATE, now)).toEqual([]);
  });
});
