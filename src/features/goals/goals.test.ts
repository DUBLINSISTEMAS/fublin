import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { goals } from "@/db/schema";
import { createTestDb } from "@/db/test-db";
import { clientInputSchema } from "@/features/clients/schema";
import { createClient, setClientStatus } from "@/features/clients/service";
import { periodClock, periodRange } from "@/lib/quinzena";
import { motivationFor } from "./motivation";
import { getCurrentPeriodProgress, getPeriodProgress, getProductionProgress, getWeeklyAppointments, listPeriodHistory, summarize, type PeriodProgress } from "./queries";

const cuts = { firstCutDay: 5, secondCutDay: 20 };
const now = new Date(2026, 8, 12, 10, 0); // 12/09/2026 → 1ª quinzena de setembro (5–19)

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
});

async function closeDeal(name: string, creditCents: number, closedAt: Date) {
  const client = await createClient(db, clientInputSchema.parse({ name, phone: "11987654321", interest: "imovel", credit: String(creditCents / 100) }), closedAt);
  await setClientStatus(db, client.id, "fechou", closedAt);
  return client;
}

describe("period progress", () => {
  it("sums the closed credit letters inside the period only", async () => {
    await closeDeal("Dentro 1", 30000000, new Date(2026, 8, 6));
    await closeDeal("Dentro 2", 20000000, new Date(2026, 8, 18, 23));
    await closeDeal("Antes", 50000000, new Date(2026, 8, 4));
    await closeDeal("Depois", 50000000, new Date(2026, 8, 20));
    const p = await getCurrentPeriodProgress(db, cuts, now, 70000000);
    expect(p.period.key).toBe("2026-09-1");
    expect(p.achievedCents).toBe(50000000);
    expect(p.closedCount).toBe(2);
    expect(p.targetCents).toBe(70000000);
    expect(p.isDefaultTarget).toBe(true);
    expect(p.percent).toBe(71);
    expect(p.remainingCents).toBe(20000000);
    expect(p.clock.daysLeft).toBe(8);
    expect(p.perDayNeededCents).toBe(2500000);
    expect(p.deals.map((d) => d.name)).toEqual(["Dentro 2", "Dentro 1"]);
  });

  it("prefers the period's own goal over the default and reports production totals", async () => {
    await db.insert(goals).values({ periodKey: "2026-09-1", targetCents: 100000000, createdAt: "x", updatedAt: "x" });
    await closeDeal("Alfa", 40000000, new Date(2026, 8, 10));
    await closeDeal("Beta", 10000000, new Date(2026, 8, 25));
    const first = await getPeriodProgress(db, "2026-09-1", cuts, now, 70000000);
    expect(first.targetCents).toBe(100000000);
    expect(first.isDefaultTarget).toBe(false);
    const production = await getProductionProgress(db, "2026-09-2", cuts, now, 70000000);
    expect(production.halves.map((h) => h.period.key)).toEqual(["2026-09-1", "2026-09-2"]);
    expect(production.achievedCents).toBe(50000000);
    expect(production.targetCents).toBe(170000000);
    expect(production.percent).toBe(29);
    const withoutDefault = await getProductionProgress(db, "2026-09-2", cuts, now, null);
    expect(withoutDefault.targetCents).toBeNull();
  });

  it("lists previous periods newest first", async () => {
    const history = await listPeriodHistory(db, cuts, now, null, 3);
    expect(history.map((h) => h.period.key)).toEqual(["2026-08-2", "2026-08-1", "2026-07-2"]);
    expect(history[0].clock.isPast).toBe(true);
  });

  it("uses a different default target for each half", async () => {
    const defaults = { defaultFirstCents: 70000000, defaultSecondCents: 50000000 };
    expect((await getPeriodProgress(db, "2026-09-1", cuts, now, defaults)).targetCents).toBe(70000000);
    expect((await getPeriodProgress(db, "2026-09-2", cuts, now, defaults)).targetCents).toBe(50000000);
    expect((await getProductionProgress(db, "2026-09-1", cuts, now, defaults)).targetCents).toBe(120000000);
  });

  it("counts appointments created and attended per week", async () => {
    const { appointments } = await import("@/db/schema");
    const client = await createClient(db, clientInputSchema.parse({ name: "Semana", phone: "11987654321", interest: "imovel" }), now);
    const row = (id: string, createdAt: Date, scheduledAt: Date, status: "agendado" | "realizado", kind: "visita" | "ligacao" = "visita") => ({
      id, clientId: client.id, scheduledAt: scheduledAt.toISOString(), durationMinutes: 60, kind, status, notes: null, reminderMinutes: 30, createdAt: createdAt.toISOString(), updatedAt: createdAt.toISOString(),
    });
    await db.insert(appointments).values([
      row("w1", new Date(2026, 8, 7, 9), new Date(2026, 8, 8, 10), "realizado"), // semana de 7/set
      row("w2", new Date(2026, 8, 8, 9), new Date(2026, 8, 9, 10), "agendado"),
      row("w3", new Date(2026, 8, 1, 9), new Date(2026, 8, 2, 10), "realizado", "ligacao"), // semana anterior; ligação não conta como atendimento
      row("w0", new Date(2026, 6, 1, 9), new Date(2026, 6, 2, 10), "realizado"), // fora da janela
    ]);
    const weeks = await getWeeklyAppointments(db, new Date(2026, 8, 12), 3);
    expect(weeks.map((w) => w.weekStart)).toEqual(["2026-08-24", "2026-08-31", "2026-09-07"]);
    expect(weeks.map((w) => w.created)).toEqual([0, 1, 2]);
    expect(weeks.map((w) => w.done)).toEqual([0, 0, 1]);
    expect(weeks[2].label).toBe("7 set");
  });
});

describe("motivationFor", () => {
  const period = periodRange("2026-09-1", cuts);
  const make = (achieved: number, target: number | null, at = now): PeriodProgress => {
    const deals = achieved ? [{ id: "1", name: "X", creditCents: achieved, ratePercent: null, closedAt: "" }] : [];
    return summarize(period, periodClock(period, at), deals, target, false);
  };

  it("adapts to progress and time left", () => {
    expect(motivationFor(make(0, null)).headline).toBe("Defina a meta desta quinzena");
    expect(motivationFor(make(0, 70000000)).tone).toBe("warning");
    expect(motivationFor(make(20000000, 70000000)).headline).toBe("29% da meta");
    expect(motivationFor(make(40000000, 70000000)).headline).toBe("Metade feita: 57%");
    expect(motivationFor(make(60000000, 70000000)).headline).toBe("86% — quase lá");
    expect(motivationFor(make(70000000, 70000000)).headline).toBe("Meta batida! 🎯");
    expect(motivationFor(make(90000000, 70000000)).detail).toContain("passou a meta");
    expect(motivationFor(make(20000000, 70000000, new Date(2026, 8, 18))).headline).toMatch(/^Reta final/);
    expect(motivationFor(make(20000000, 70000000, new Date(2026, 8, 25))).headline).toBe("Fechou em 29% da meta");
    expect(motivationFor(make(0, 70000000, new Date(2026, 8, 1))).headline).toBe("Quinzena ainda não começou");
  });
});
