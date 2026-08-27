import { addDays, addMonths, differenceInCalendarDays, format, getDaysInMonth, parse, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Quinzenas: a loja fecha a produção em dois períodos por mês, "virando" em dois
 * dias de corte (ex.: 5 e 20). A 1ª quinzena vai do 1º corte até a véspera do 2º;
 * a 2ª vai do 2º corte até a véspera do 1º corte do mês seguinte. Duas quinzenas
 * seguidas (1ª + 2ª do mesmo mês de referência) formam uma "produção".
 */
export type PeriodCuts = { firstCutDay: number; secondCutDay: number };

export const DEFAULT_CUTS: PeriodCuts = { firstCutDay: 5, secondCutDay: 20 };

/** "2026-09-1" = 1ª quinzena com referência em setembro/2026; "2026-09-2" = a 2ª. */
export type PeriodKey = string;

const KEY_RE = /^(\d{4})-(\d{2})-([12])$/;
const REF = new Date(2000, 0, 1);

export function isValidPeriodKey(value: string | null | undefined): value is PeriodKey {
  if (!value || !KEY_RE.test(value)) return false;
  const month = Number(value.slice(5, 7));
  return month >= 1 && month <= 12;
}

/** Dia de corte dentro do mês (meses curtos usam o último dia). */
function cutDate(year: number, monthIndex: number, day: number): Date {
  const first = new Date(year, monthIndex, 1);
  return new Date(year, monthIndex, Math.min(day, getDaysInMonth(first)));
}

export type Period = { key: PeriodKey; half: 1 | 2; start: Date; end: Date; refMonth: Date };

/** [início, fim) da quinzena. */
export function periodRange(key: PeriodKey, cuts: PeriodCuts = DEFAULT_CUTS): Period {
  const match = KEY_RE.exec(key);
  if (!match) throw new Error(`Chave de quinzena inválida: ${key}`);
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const half = Number(match[3]) as 1 | 2;
  const refMonth = new Date(year, monthIndex, 1);
  if (half === 1) {
    return { key, half, start: cutDate(year, monthIndex, cuts.firstCutDay), end: cutDate(year, monthIndex, cuts.secondCutDay), refMonth };
  }
  const next = addMonths(refMonth, 1);
  return { key, half, start: cutDate(year, monthIndex, cuts.secondCutDay), end: cutDate(next.getFullYear(), next.getMonth(), cuts.firstCutDay), refMonth };
}

export function periodKey(refMonth: Date, half: 1 | 2): PeriodKey {
  return `${format(refMonth, "yyyy-MM")}-${half}`;
}

/** Quinzena que contém a data. */
export function periodFor(date: Date, cuts: PeriodCuts = DEFAULT_CUTS): Period {
  const day = startOfDay(date);
  const thisMonth = new Date(day.getFullYear(), day.getMonth(), 1);
  // Candidatas: 2ª do mês anterior, 1ª e 2ª deste mês — uma delas contém o dia.
  const candidates = [periodKey(addMonths(thisMonth, -1), 2), periodKey(thisMonth, 1), periodKey(thisMonth, 2)];
  for (const key of candidates) {
    const p = periodRange(key, cuts);
    if (day >= p.start && day < p.end) return p;
  }
  // Só acontece com cortes degenerados (iguais); cai na 1ª do mês.
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
