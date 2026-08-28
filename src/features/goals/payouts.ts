import { addDays } from "date-fns";
import { toIso } from "@/lib/dates";
import { periodClock, periodTitle, type PeriodKey } from "@/lib/quinzena";
import { commissionCents } from "./commission";
import type { PeriodProgress } from "./queries";

/** Situação da quinzena na planilha de recebimentos. */
export const PAYOUT_STATUSES = ["Em andamento", "Fechada", "Futura"] as const;
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];

export type PayoutRow = {
  periodKey: PeriodKey;
  /** "1ª quinzena" / "2ª quinzena" */
  title: string;
  /** ISO do primeiro dia. */
  start: string;
  /** ISO do último dia (inclusivo). */
  end: string;
  closedCount: number;
  /** Soma das cartas fechadas na quinzena (centavos). */
  salesCents: number;
  /** Comissão do relacionador sobre a produção (centavos). */
  commissionCents: number;
  status: PayoutStatus;
};

function statusOf(progress: PeriodProgress, now: Date): PayoutStatus {
  const clock = periodClock(progress.period, now);
  if (clock.isPast) return "Fechada";
  if (clock.isCurrent) return "Em andamento";
  return "Futura";
}

/** Uma linha por quinzena (na ordem recebida), com a comissão calculada pela taxa vigente. */
export function buildPayoutRows(periods: readonly PeriodProgress[], ratePercent: number, now: Date): PayoutRow[] {
  return periods.map((progress) => ({
    periodKey: progress.period.key,
    title: periodTitle(progress.period),
    start: toIso(progress.period.start),
    end: toIso(addDays(progress.period.end, -1)),
    closedCount: progress.closedCount,
    salesCents: progress.achievedCents,
    commissionCents: commissionCents(progress.achievedCents, ratePercent),
    status: statusOf(progress, now),
  }));
}
