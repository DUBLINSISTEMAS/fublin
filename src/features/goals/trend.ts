import type { WeekPoint } from "./queries";

export type Trend = { direction: "up" | "down" | "flat"; headline: string; detail: string; recentAverage: number; previousAverage: number };

const average = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ","));

/**
 * Compara a média de agendamentos das últimas semanas (excluindo a atual, que está pela metade)
 * com a média das anteriores. É a frase "evoluindo / regredindo" da sidebar e da tela de Metas.
 */
export function appointmentsTrend(weeks: WeekPoint[], window = 3): Trend {
  const finished = weeks.slice(0, -1);
  const recent = finished.slice(-window).map((w) => w.created);
  const previous = finished.slice(-window * 2, -window).map((w) => w.created);
  const recentAverage = average(recent);
  const previousAverage = average(previous);
  if (previous.length === 0 || recent.length === 0) {
    return { direction: "flat", headline: "Ainda sem histórico", detail: "Depois de algumas semanas marcando, o sistema mostra se você está evoluindo.", recentAverage, previousAverage };
  }
  const delta = recentAverage - previousAverage;
  const tolerance = Math.max(0.5, previousAverage * 0.1);
  if (delta > tolerance) {
    return { direction: "up", headline: "Evoluindo", detail: `Média de ${fmt(recentAverage)} agendamentos por semana, contra ${fmt(previousAverage)} nas ${window} semanas anteriores.`, recentAverage, previousAverage };
  }
  if (delta < -tolerance) {
    return { direction: "down", headline: "Regredindo", detail: `Média caiu para ${fmt(recentAverage)} agendamentos por semana (eram ${fmt(previousAverage)}). Hora de puxar a agenda.`, recentAverage, previousAverage };
  }
  return { direction: "flat", headline: "Estável", detail: `Média de ${fmt(recentAverage)} agendamentos por semana, igual às ${window} semanas anteriores.`, recentAverage, previousAverage };
}
