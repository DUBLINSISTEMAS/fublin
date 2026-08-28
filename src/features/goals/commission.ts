/** Comissão do relacionador: percentual sobre a soma das cartas fechadas. */
export function commissionCents(salesCents: number, ratePercent: number): number {
  return Math.round((salesCents * ratePercent) / 100);
}

/** "0,4%" */
export function formatPercent(ratePercent: number): string {
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(ratePercent)}%`;
}
