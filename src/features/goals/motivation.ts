import { formatBRLCompact } from "@/lib/money";
import { plural } from "@/lib/text";
import type { PeriodProgress } from "./queries";

export type Motivation = { headline: string; detail: string; tone: "success" | "warning" | "info" | "neutral" };

/**
 * Frase curta que empurra para a ação — muda conforme o progresso e o tempo que
 * resta na quinzena. Sem meta, convida a definir uma.
 */
export function motivationFor(p: PeriodProgress): Motivation {
  const { clock } = p;
  if (p.targetCents === null) {
    return { headline: "Defina a meta desta quinzena", detail: "Com uma meta na tela, cada carta fechada vira progresso visível.", tone: "neutral" };
  }
  if (p.achievedCents >= p.targetCents) {
    const extra = p.achievedCents - p.targetCents;
    return {
      headline: "Meta batida! 🎯",
      detail: extra > 0 ? `Você já passou a meta em ${formatBRLCompact(extra)}. Daqui pra frente é bônus.` : "Fechou exatamente na meta. Que tal uma carta a mais de bônus?",
      tone: "success",
    };
  }
  if (clock.isPast) {
    return { headline: `Fechou em ${p.percent}% da meta`, detail: `Faltaram ${formatBRLCompact(p.remainingCents)}. A próxima quinzena começa do zero — bora.`, tone: "neutral" };
  }
  if (!clock.isCurrent) {
    return { headline: "Quinzena ainda não começou", detail: `Meta de ${formatBRLCompact(p.targetCents)}. Use estes dias para encher a agenda de visitas.`, tone: "info" };
  }
  const remaining = formatBRLCompact(p.remainingCents);
  const perDay = formatBRLCompact(p.perDayNeededCents);
  if (p.achievedCents === 0) {
    return {
      headline: "A primeira carta ainda não caiu",
      detail: clock.daysLeft <= 3 ? `Reta final: ${plural(clock.daysLeft, "dia")} para ${remaining}. Toda visita conta.` : `${remaining} em ${plural(clock.daysLeft, "dia")}: ${perDay} por dia. Agende visitas hoje.`,
      tone: "warning",
    };
  }
  if (clock.daysLeft <= 3) {
    return { headline: `Reta final: faltam ${remaining}`, detail: `${plural(clock.daysLeft, "dia")} e ${p.percent}% feito. Puxe os clientes em negociação e análise.`, tone: "warning" };
  }
  if (p.percent >= 75) {
    return { headline: `${p.percent}% — quase lá`, detail: `Faltam ${remaining}. Mais ${plural(Math.ceil(p.remainingCents / Math.max(1, p.achievedCents / p.closedCount)), "carta")} do tamanho das que você já fechou.`, tone: "success" };
  }
  if (p.percent >= 50) {
    return { headline: `Metade feita: ${p.percent}%`, detail: `Faltam ${remaining} em ${plural(clock.daysLeft, "dia")} — ${perDay} por dia mantém o ritmo.`, tone: "info" };
  }
  return { headline: `${p.percent}% da meta`, detail: `Faltam ${remaining}: ${perDay} por dia nos próximos ${plural(clock.daysLeft, "dia")}.`, tone: "info" };
}
