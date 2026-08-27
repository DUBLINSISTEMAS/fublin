import { getDb } from "@/db/client";
import { listApproved } from "@/features/clients/queries";
import { toCsv } from "@/lib/csv";
import { dayKey, formatDate, fromIso, isValidMonthKey, monthRange } from "@/lib/dates";
import { ATTENDANCE_LABELS, CLIENT_STATUS_LABELS, INTEREST_LABELS } from "@/lib/domain";
import { formatPhone } from "@/lib/phone";

export const dynamic = "force-dynamic";

const cents = (v: number | null) => (v === null ? "" : (v / 100).toFixed(2).replace(".", ","));
const day = (iso: string | null) => (iso ? formatDate(fromIso(iso)) : "");

/** Exporta os aprovados (mesmos filtros da tela: `mes=YYYY-MM|todos`, `lider=id`). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mes = url.searchParams.get("mes");
  const leaderId = url.searchParams.get("lider") || undefined;
  const now = new Date();
  const range = mes === "todos" ? undefined : monthRange(isValidMonthKey(mes) ? mes : dayKey(now).slice(0, 7));

  const db = await getDb();
  const rows = await listApproved(db, { periodStart: range?.start, periodEnd: range?.end, leaderId });
  const csv = toCsv(rows, [
    { key: "name", label: "Cliente" },
    { key: "phone", label: "Telefone", get: (r) => formatPhone(r.phone) },
    { key: "leader", label: "Líder de vendas", get: (r) => r.leader?.name ?? "" },
    { key: "interest", label: "Interesse", get: (r) => INTEREST_LABELS[r.interest] },
    { key: "interestNotes", label: "Detalhe" },
    { key: "attendance", label: "Atendimento", get: (r) => ATTENDANCE_LABELS[r.attendance] },
    { key: "creditCents", label: "Carta (R$)", get: (r) => cents(r.creditCents) },
    { key: "adesaoCents", label: "Adesão (R$)", get: (r) => cents(r.adesaoCents) },
    { key: "status", label: "Situação", get: (r) => CLIENT_STATUS_LABELS[r.status] },
    { key: "firstVisitAt", label: "1º atendimento", get: (r) => day(r.firstVisitAt) },
    { key: "analysisStartedAt", label: "Em análise desde", get: (r) => day(r.analysisStartedAt) },
    { key: "approvedAt", label: "Aprovado em", get: (r) => day(r.approvedAt) },
    { key: "closedAt", label: "Fechou em", get: (r) => day(r.closedAt) },
    { key: "meetingsCount", label: "Atendimentos" },
    { key: "attachmentsCount", label: "Anexos" },
  ]);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="aprovados-${mes === "todos" ? "todos" : (range ? dayKey(range.start).slice(0, 7) : dayKey(now))}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
