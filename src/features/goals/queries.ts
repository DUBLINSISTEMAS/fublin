import { and, desc, eq, gte, lt } from "drizzle-orm";
import type { Db } from "@/db/client";
import { clients, goals } from "@/db/schema";
import { toIso } from "@/lib/dates";
import { periodClock, periodFor, periodRange, productionOf, shiftPeriod, type Period, type PeriodClock, type PeriodCuts, type PeriodKey } from "@/lib/quinzena";

export type ClosedDeal = { id: string; name: string; creditCents: number | null; closedAt: string };

export type PeriodProgress = {
  period: Period;
  clock: PeriodClock;
  /** Meta da quinzena (própria ou padrão); null = sem meta definida. */
  targetCents: number | null;
  /** Se a meta veio da configuração padrão, e não de uma meta própria. */
  isDefaultTarget: boolean;
  /** Soma das cartas fechadas na quinzena. */
  achievedCents: number;
  closedCount: number;
  /** 0–100 (pode passar de 100). */
  percent: number;
  remainingCents: number;
  /** Quanto precisa fechar por dia restante para bater a meta. */
  perDayNeededCents: number;
  deals: ClosedDeal[];
};

/** Cartas fechadas com `closedAt` dentro de [start, end). */
export async function listClosedDeals(db: Db, start: Date, end: Date): Promise<ClosedDeal[]> {
  const rows = await db
    .select({ id: clients.id, name: clients.name, creditCents: clients.creditCents, closedAt: clients.closedAt })
    .from(clients)
    .where(and(eq(clients.status, "fechou"), gte(clients.closedAt, toIso(start)), lt(clients.closedAt, toIso(end))))
    .orderBy(desc(clients.closedAt));
  return rows.map((r) => ({ ...r, closedAt: r.closedAt ?? "" }));
}

export async function getGoalTarget(db: Db, key: PeriodKey): Promise<number | null> {
  const row = await db.query.goals.findFirst({ where: eq(goals.periodKey, key) });
  return row?.targetCents ?? null;
}

export function summarize(period: Period, clock: PeriodClock, deals: ClosedDeal[], target: number | null, isDefaultTarget: boolean): PeriodProgress {
  const achievedCents = deals.reduce((sum, d) => sum + (d.creditCents ?? 0), 0);
  const remainingCents = target ? Math.max(0, target - achievedCents) : 0;
  const percent = target ? Math.round((achievedCents / target) * 100) : 0;
  const perDayNeededCents = clock.daysLeft > 0 ? Math.ceil(remainingCents / clock.daysLeft) : remainingCents;
  return { period, clock, targetCents: target, isDefaultTarget, achievedCents, closedCount: deals.length, percent, remainingCents, perDayNeededCents, deals };
}

export async function getPeriodProgress(db: Db, key: PeriodKey, cuts: PeriodCuts, now: Date, defaultTarget: number | null): Promise<PeriodProgress> {
  const period = periodRange(key, cuts);
  const [deals, own] = await Promise.all([listClosedDeals(db, period.start, period.end), getGoalTarget(db, key)]);
  return summarize(period, periodClock(period, now), deals, own ?? defaultTarget, own === null);
}

export async function getCurrentPeriodProgress(db: Db, cuts: PeriodCuts, now: Date, defaultTarget: number | null): Promise<PeriodProgress> {
  return getPeriodProgress(db, periodFor(now, cuts).key, cuts, now, defaultTarget);
}

export type ProductionProgress = { halves: [PeriodProgress, PeriodProgress]; targetCents: number | null; achievedCents: number; percent: number };

/** As duas quinzenas de uma produção, somadas. */
export async function getProductionProgress(db: Db, key: PeriodKey, cuts: PeriodCuts, now: Date, defaultTarget: number | null): Promise<ProductionProgress> {
  const [first, second] = productionOf(key, cuts);
  const halves = await Promise.all([getPeriodProgress(db, first.key, cuts, now, defaultTarget), getPeriodProgress(db, second.key, cuts, now, defaultTarget)]);
  const targetCents = halves.every((h) => h.targetCents !== null) ? halves[0].targetCents! + halves[1].targetCents! : null;
  const achievedCents = halves[0].achievedCents + halves[1].achievedCents;
  return { halves: [halves[0], halves[1]], targetCents, achievedCents, percent: targetCents ? Math.round((achievedCents / targetCents) * 100) : 0 };
}

/** Quinzenas anteriores à atual, da mais recente para a mais antiga. */
export async function listPeriodHistory(db: Db, cuts: PeriodCuts, now: Date, defaultTarget: number | null, count = 6): Promise<PeriodProgress[]> {
  const current = periodFor(now, cuts).key;
  const keys = Array.from({ length: count }, (_, i) => shiftPeriod(current, -(i + 1), cuts).key);
  return Promise.all(keys.map((key) => getPeriodProgress(db, key, cuts, now, defaultTarget)));
}
