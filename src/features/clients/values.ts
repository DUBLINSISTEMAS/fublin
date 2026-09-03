import type { Client } from "@/db/schema";
import { formatPercent } from "@/features/goals/commission";
import { formatBRL, formatBRLCompact } from "@/lib/money";

type Money = Pick<Client, "adesaoCents" | "installmentMinCents" | "installmentMaxCents"> & Partial<Pick<Client, "commissionRatePercent">>;

/** "R$ 800 a R$ 1,2 mil", "R$ 900" (parcela fixa) ou null. */
export function installmentRange(client: Pick<Money, "installmentMinCents" | "installmentMaxCents">, format = formatBRLCompact): string | null {
  const min = client.installmentMinCents;
  const max = client.installmentMaxCents;
  if (min && max && min !== max) return `${format(min)} a ${format(max)}`;
  if (max || min) return format(max ?? min);
  return null;
}

/**
 * Linha de valores do card e da lista: adesão, parcela e, quando a venda tem taxa própria, a comissão.
 * "Adesão R$ 5 mil · Parcela R$ 800 a R$ 1,2 mil · Comissão 0,5%"; null quando nada foi combinado.
 */
export function valuesLine(client: Money): string | null {
  const parts: string[] = [];
  if (client.adesaoCents) parts.push(`Adesão ${formatBRLCompact(client.adesaoCents)}`);
  const range = installmentRange(client);
  if (range) parts.push(`Parcela ${range}`);
  if (client.commissionRatePercent != null) parts.push(`Comissão ${formatPercent(client.commissionRatePercent)}`);
  return parts.length ? parts.join(" · ") : null;
}

/** Versão por extenso para a página do cliente: "R$ 800,00 a R$ 1.200,00". */
export function installmentRangeLong(client: Pick<Money, "installmentMinCents" | "installmentMaxCents">): string {
  return installmentRange(client, formatBRL) ?? "—";
}
