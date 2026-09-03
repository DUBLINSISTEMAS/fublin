import { getDb } from "@/db/client";
import { listApproved, type ApprovedItem } from "@/features/clients/queries";
import { dealCommissionCents, formatPercent } from "@/features/goals/commission";
import { getSettings } from "@/features/settings/service";
import { ATTENDANCE_LABELS, CLIENT_STATUS_LABELS, INTEREST_LABELS } from "@/lib/domain";
import { resolvePeriodFilter } from "@/lib/period-filter";
import { formatPhone } from "@/lib/phone";
import type { SearchParams } from "@/lib/search-params";
import { buildWorkbook, xlsxResponse, type XlsxColumn } from "@/lib/xlsx";
import { apiAuth } from "@/features/auth/api";

export const dynamic = "force-dynamic";

/** Colunas da planilha; a comissão de cada carta sai pela taxa própria ou, sem ela, pela padrão. */
const columns = (defaultRatePercent: number): XlsxColumn<ApprovedItem>[] => [
  { label: "Cliente", type: "text", width: 28, get: (r) => r.name },
  { label: "Telefone", type: "text", width: 16, get: (r) => formatPhone(r.phone) },
  { label: "Líder de vendas", type: "text", width: 22, get: (r) => r.leader?.name },
  { label: "Interesse", type: "text", width: 12, get: (r) => INTEREST_LABELS[r.interest] },
  { label: "Detalhe", type: "text", width: 28, get: (r) => r.interestNotes },
  { label: "Atendimento", type: "text", width: 14, get: (r) => ATTENDANCE_LABELS[r.attendance] },
  { label: "Carta (R$)", type: "money", get: (r) => r.creditCents },
  { label: "Adesão (R$)", type: "money", get: (r) => r.adesaoCents },
  { label: "Comissão (%)", type: "text", width: 13, get: (r) => formatPercent(r.commissionRatePercent ?? defaultRatePercent) },
  { label: "Comissão (R$)", type: "money", width: 14, get: (r) => (r.status === "fechou" ? dealCommissionCents({ creditCents: r.creditCents, ratePercent: r.commissionRatePercent }, defaultRatePercent) : null) },
  { label: "Situação", type: "text", width: 14, get: (r) => CLIENT_STATUS_LABELS[r.status] },
  { label: "1º atendimento", type: "date", width: 14, get: (r) => r.firstVisitAt },
  { label: "Em análise desde", type: "date", width: 16, get: (r) => r.analysisStartedAt },
  { label: "Aprovado em", type: "date", get: (r) => r.approvedAt },
  { label: "Fechou em", type: "date", get: (r) => r.closedAt },
  { label: "Atendimentos", type: "integer", width: 13, get: (r) => r.meetingsCount },
  { label: "Anexos", type: "integer", get: (r) => r.attachmentsCount },
];

/** Exporta os aprovados em Excel com os mesmos filtros da tela (`periodo`, `q`/`mes`, `lider`). */
export async function GET(request: Request) {
  const denied = await apiAuth(true); if (denied) return denied;
  const url = new URL(request.url);
  const params: SearchParams = Object.fromEntries(url.searchParams.entries());
  const leaderId = url.searchParams.get("lider") || undefined;
  const db = await getDb();
  const settings = await getSettings(db);
  const period = resolvePeriodFilter(params, settings.period, new Date());

  const rows = await listApproved(db, { periodStart: period.range?.start, periodEnd: period.range?.end, leaderId });
  const buffer = await buildWorkbook({ sheetName: "Aprovados", columns: columns(settings.commission.ratePercent), rows });
  const suffix = period.mode === "todos" ? "todos" : (period.key ?? "periodo");
  return xlsxResponse(buffer, `aprovados-${suffix}.xlsx`);
}
