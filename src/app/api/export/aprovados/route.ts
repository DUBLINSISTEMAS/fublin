import { getDb } from "@/db/client";
import { listApproved } from "@/features/clients/queries";
import { getSettings } from "@/features/settings/service";
import { toCsv } from "@/lib/csv";
import { formatDate, fromIso } from "@/lib/dates";
import { ATTENDANCE_LABELS, CLIENT_STATUS_LABELS, INTEREST_LABELS } from "@/lib/domain";
import { centsToCsv } from "@/lib/money";
import { resolvePeriodFilter } from "@/lib/period-filter";
import { formatPhone } from "@/lib/phone";
import type { SearchParams } from "@/lib/search-params";

export const dynamic = "force-dynamic";

const day = (iso: string | null) => (iso ? formatDate(fromIso(iso)) : "");

/** Exporta os aprovados com os mesmos filtros da tela (`periodo`, `q`/`mes`, `lider`). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const params: SearchParams = Object.fromEntries(url.searchParams.entries());
  const leaderId = url.searchParams.get("lider") || undefined;
  const db = await getDb();
  const settings = await getSettings(db);
  const period = resolvePeriodFilter(params, settings.period, new Date());

  const rows = await listApproved(db, { periodStart: period.range?.start, periodEnd: period.range?.end, leaderId });
  const csv = toCsv(rows, [
    { key: "name", label: "Cliente" },
    { key: "phone", label: "Telefone", get: (r) => formatPhone(r.phone) },
    { key: "leader", label: "Líder de vendas", get: (r) => r.leader?.name ?? "" },
    { key: "interest", label: "Interesse", get: (r) => INTEREST_LABELS[r.interest] },
    { key: "interestNotes", label: "Detalhe" },
    { key: "attendance", label: "Atendimento", get: (r) => ATTENDANCE_LABELS[r.attendance] },
    { key: "creditCents", label: "Carta (R$)", get: (r) => centsToCsv(r.creditCents) },
    { key: "adesaoCents", label: "Adesão (R$)", get: (r) => centsToCsv(r.adesaoCents) },
    { key: "status", label: "Situação", get: (r) => CLIENT_STATUS_LABELS[r.status] },
    { key: "firstVisitAt", label: "1º atendimento", get: (r) => day(r.firstVisitAt) },
    { key: "analysisStartedAt", label: "Em análise desde", get: (r) => day(r.analysisStartedAt) },
    { key: "approvedAt", label: "Aprovado em", get: (r) => day(r.approvedAt) },
    { key: "closedAt", label: "Fechou em", get: (r) => day(r.closedAt) },
    { key: "meetingsCount", label: "Atendimentos" },
    { key: "attachmentsCount", label: "Anexos" },
  ]);
  const suffix = period.mode === "todos" ? "todos" : (period.key ?? "periodo");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="aprovados-${suffix}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
