import { addDays, addMonths, differenceInCalendarDays, format, getDaysInMonth, parse, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Quinzenas: a loja fecha a produção em dois períodos por mês. A **1ª quinzena**
 * começa no 1º corte e vai até a véspera do 2º corte; a **2ª** começa no 2º corte
 * e vai até a véspera do 1º corte seguinte. Os cortes podem estar em qualquer ordem
 * dentro do mês: (5, 20) dá 5→19 e 20→4; (20, 5) dá 20→4 e 5→19 — o dono escolhe
 * qual delas chama de 1ª. Duas quinzenas seguidas (1ª + 2ª do mesmo mês de
 * referência) formam uma "produção".
 */
export type PeriodCuts = { firstCutDay: number; secondCutDay: number };

export const DEFAULT_CUTS: PeriodCuts = { firstCutDay: 5, secondCutDay: 20 };

/** "2026-09-1" = 1ª quinzena que começa em setembro/2026; "2026-09-2" = a 2ª que vem logo depois. */
export type PeriodKey = string;

const KEY_RE = /^(\d{4})-(\d{2})-([12])$/;
const REF = new Date(2000, 0, 1);

export function isValidPeriodKey(value: string | null | undefined): value is PeriodKey {
  if (!value || !KEY_RE.test(value)) return false;
  const month = Number(value.slice(5, 7));
  return month >= 1 && month <= 12;
}

/** Dia de corte dentro do mês (meses curtos usam o último dia). */
function cutDate(monthStart: Date, day: number): Date {
  return new Date(monthStart.getFullYear(), monthStart.getMonth(), Math.min(day, getDaysInMonth(monthStart)));
}

export type Period = { key: PeriodKey; half: 1 | 2; start: Date; end: Date; refMonth: Date };

/** [início, fim) da quinzena. */
export function periodRange(key: PeriodKey, cuts: PeriodCuts = DEFAULT_CUTS): Period {
  const match = KEY_RE.exec(key);
  if (!match) throw new Error(`Chave de quinzena inválida: ${key}`);
  const refMonth = new Date(Number(match[1]), Number(match[2]) - 1, 1);
  const half = Number(match[3]) as 1 | 2;
  const nextMonth = addMonths(refMonth, 1);
  const firstStart = cutDate(refMonth, cuts.firstCutDay);
  // O 2º corte cai no mesmo mês se vier depois do 1º; senão, no mês seguinte (ex.: 20 → 5).
  const secondStart = cuts.secondCutDay > cuts.firstCutDay ? cutDate(refMonth, cuts.secondCutDay) : cutDate(nextMonth, cuts.secondCutDay);
  const nextFirstStart = cutDate(nextMonth, cuts.firstCutDay);
  return half === 1 ? { key, half, start: firstStart, end: secondStart, refMonth } : { key, half, start: secondStart, end: nextFirstStart, refMonth };
}

export function periodKey(refMonth: Date, half: 1 | 2): PeriodKey {
  return `${format(refMonth, "yyyy-MM")}-${half}`;
}

/** Quinzena que contém a data. */
export function periodFor(date: Date, cuts: PeriodCuts = DEFAULT_CUTS): Period {
  const day = startOfDay(date);
  const thisMonth = new Date(day.getFullYear(), day.getMonth(), 1);
  // Uma quinzena pode começar até dois meses antes do dia (ex.: cortes 20 e 5 no fim do mês anterior).
  for (const months of [-2, -1, 0]) {
    const refMonth = addMonths(thisMonth, months);
    for (const half of [1, 2] as const) {
      const p = periodRange(periodKey(refMonth, half), cuts);
      if (day >= p.start && day < p.end) return p;
    }
  }
  // Só acontece com cortes iguais (quinzena vazia); cai na 1ª do mês.
  return periodRange(periodKey(thisMonth, 1), cuts);
}

export function shiftPeriod(key: PeriodKey, steps: number, cuts: PeriodCuts = DEFAULT_CUTS): Period {
  const { half, refMonth } = periodRange(key, cuts);
  const index = half - 1 + steps;
  const months = Math.floor(index / 2);
  const nextHalf = (((index % 2) + 2) % 2) as 0 | 1;
  return periodRange(periodKey(addMonths(refMonth, months), (nextHalf + 1) as 1 | 2), cuts);
}

/** As duas quinzenas de uma produção (mesmo mês de referência). */
export function productionOf(key: PeriodKey, cuts: PeriodCuts = DEFAULT_CUTS): [Period, Period] {
  const { refMonth } = periodRange(key, cuts);
  return [periodRange(periodKey(refMonth, 1), cuts), periodRange(periodKey(refMonth, 2), cuts)];
}

/** "1ª quinzena" / "2ª quinzena" */
export function periodTitle(period: Period): string {
  return `${period.half}ª quinzena`;
}

/** "5 a 19 de set" — o fim é exclusivo, então mostra a véspera. */
export function periodDatesLabel(period: Period): string {
  const last = addDays(period.end, -1);
  const sameMonth = period.start.getMonth() === last.getMonth();
  const month = (d: Date) => format(d, "MMM", { locale: ptBR }).replace(".", "");
  return sameMonth ? `${period.start.getDate()} a ${last.getDate()} de ${month(last)}` : `${period.start.getDate()} ${month(period.start)} a ${last.getDate()} ${month(last)}`;
}

/** Rótulo curto para gráficos: "2ª ago" (mês em que a quinzena começa). */
export function periodShortLabel(period: Period): string {
  return `${period.half}ª ${format(period.start, "MMM", { locale: ptBR }).replace(".", "")}`;
}

/** "Produção de setembro" */
export function productionLabel(period: Period): string {
  return `Produção de ${format(period.refMonth, "MMMM", { locale: ptBR })}`;
}

export type PeriodClock = { daysTotal: number; daysGone: number; daysLeft: number; isCurrent: boolean; isPast: boolean };

/** Onde estamos dentro da quinzena (dias corridos; o dia de hoje conta como restante). */
export function periodClock(period: Period, now: Date): PeriodClock {
  const today = startOfDay(now);
  const daysTotal = differenceInCalendarDays(period.end, period.start);
  const isPast = today >= period.end;
  const isCurrent = today >= period.start && !isPast;
  const daysGone = isPast ? daysTotal : Math.max(0, differenceInCalendarDays(today, period.start));
  return { daysTotal, daysGone, daysLeft: Math.max(0, daysTotal - daysGone), isCurrent, isPast };
}

/** Converte "2026-09-05" em Date local (para testes e páginas). */
export function dayFromKey(day: string): Date {
  return parse(day, "yyyy-MM-dd", REF);
}
