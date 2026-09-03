/** Comissão do relacionador: percentual sobre a soma das cartas fechadas. */
export function commissionCents(salesCents: number, ratePercent: number): number {
  return Math.round((salesCents * ratePercent) / 100);
}

/** O que uma carta fechada precisa ter para calcular a própria comissão. */
export type CommissionDeal = { creditCents: number | null; /** Taxa própria desta venda; null = padrão das configurações. */ ratePercent: number | null };

/** Comissão de uma carta: pela taxa própria da venda ou, sem ela, pela taxa padrão. */
export function dealCommissionCents(deal: CommissionDeal, defaultRatePercent: number): number {
  return commissionCents(deal.creditCents ?? 0, deal.ratePercent ?? defaultRatePercent);
}

/** Comissão de várias cartas, cada uma pela própria taxa (o que faz a venda de 0,5% contar como 0,5%). */
export function dealsCommissionCents(deals: readonly CommissionDeal[], defaultRatePercent: number): number {
  return deals.reduce((sum, deal) => sum + dealCommissionCents(deal, defaultRatePercent), 0);
}

/** "0,4%" */
export function formatPercent(ratePercent: number): string {
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(ratePercent)}%`;
}

/** "0,5" para um campo de porcentagem digitável; vazio quando a venda usa o padrão. */
export function percentToInput(ratePercent: number | null): string {
  return ratePercent === null ? "" : String(ratePercent).replace(".", ",");
}

/** Taxas prontas no seletor da venda (além do padrão e de "personalizar"). */
export const COMMISSION_RATE_PRESETS = [0.5, 0.6, 0.8] as const;
