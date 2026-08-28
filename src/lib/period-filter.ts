import { formatMonthLong, isValidMonthKey, monthKey, monthRange, shiftMonthKey } from "./dates";
import { isValidPeriodKey, periodDatesLabel, periodFor, periodRange, periodTitle, shiftPeriod, type PeriodCuts } from "./quinzena";
import { pickParam, type SearchParams } from "./search-params";

export const PERIOD_MODES = ["quinzena", "mes", "todos"] as const;
export type PeriodMode = (typeof PERIOD_MODES)[number];
export const PERIOD_MODE_LABELS: Record<PeriodMode, string> = { quinzena: "Quinzena", mes: "Mês", todos: "Tudo" };

export type ResolvedPeriod = {
  mode: PeriodMode;
  /** "1ª quinzena · 5 a 19 de set", "Setembro de 2026" ou "Todo o período". */
  label: string;
  /** [start, end); ausente em "todos". */
  range?: { start: Date; end: Date };
  /** Chave atual e vizinhas, para as setas (ausentes em "todos"). */
  key?: string;
  previousKey?: string;
  nextKey?: string;
  isCurrent: boolean;
  /** Parâmetros que reproduzem este filtro em outra URL (ex.: exportar Excel). */
  query: Record<string, string>;
};

/**
 * Lê `?periodo=quinzena|mes|todos` + `q=` (quinzena) ou `mes=` da URL e devolve o
 * intervalo pronto para as consultas. Padrão: a quinzena atual.
 */
export function resolvePeriodFilter(params: SearchParams, cuts: PeriodCuts, now: Date): ResolvedPeriod {
  const requested = pickParam(params, "periodo");
  const mode: PeriodMode = (PERIOD_MODES as readonly string[]).includes(requested ?? "") ? (requested as PeriodMode) : "quinzena";

  if (mode === "todos") return { mode, label: "Todo o período", isCurrent: true, query: { periodo: "todos" } };

  if (mode === "mes") {
    const current = monthKey(now);
    const requestedKey = pickParam(params, "mes");
    const key = isValidMonthKey(requestedKey) ? requestedKey : current;
    const range = monthRange(key);
    return {
      mode,
      key,
      label: formatMonthLong(range.start),
      range,
      previousKey: shiftMonthKey(key, -1),
      nextKey: shiftMonthKey(key, 1),
      isCurrent: key === current,
      query: { periodo: "mes", ...(key !== current ? { mes: key } : {}) },
    };
  }

  const current = periodFor(now, cuts).key;
  const requestedKey = pickParam(params, "q");
  const key = isValidPeriodKey(requestedKey) ? requestedKey : current;
  const period = periodRange(key, cuts);
  return {
    mode,
    key,
    label: `${periodTitle(period)} · ${periodDatesLabel(period)}`,
    range: { start: period.start, end: period.end },
    previousKey: shiftPeriod(key, -1, cuts).key,
    nextKey: shiftPeriod(key, 1, cuts).key,
    isCurrent: key === current,
    query: key !== current ? { q: key } : {},
  };
}
