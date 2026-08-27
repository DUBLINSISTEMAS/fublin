import { getDb } from "@/db/client";
import { listClients } from "@/features/clients/queries";
import { toCsv } from "@/lib/csv";
import { dayKey, formatDate, formatWhen, fromIso } from "@/lib/dates";
import { ATTENDANCE_LABELS, CLIENT_STATUS_LABELS, INTEREST_LABELS, labelOf, SOURCE_LABELS } from "@/lib/domain";
import { centsToCsv } from "@/lib/money";
import { formatPhone } from "@/lib/phone";

export const dynamic = "force-dynamic";

const day = (iso: string | null) => (iso ? formatDate(fromIso(iso)) : "");

/** Exporta todos os clientes em CSV (Excel pt-BR), com as colunas do funil v2. */
export async function GET() {
  const db = await getDb();
  const now = new Date();
  const rows = await listClients(db, {}, now);
  const csv = toCsv(rows, [
    { key: "name", label: "Nome" },
    { key: "phone", label: "Telefone", get: (r) => formatPhone(r.phone) },
    { key: "email", label: "E-mail" },
    { key: "interest", label: "Interesse", get: (r) => INTEREST_LABELS[r.interest] },
    { key: "interestNotes", label: "Detalhe do interesse" },
    { key: "creditCents", label: "Carta (R$)", get: (r) => centsToCsv(r.creditCents) },
    { key: "status", label: "Etapa", get: (r) => CLIENT_STATUS_LABELS[r.status] },
    { key: "attendance", label: "Atendimento", get: (r) => ATTENDANCE_LABELS[r.attendance] },
    { key: "source", label: "Origem", get: (r) => labelOf(SOURCE_LABELS, r.source) },
    { key: "leader", label: "Líder de vendas", get: (r) => r.leader?.name ?? "" },
    { key: "firstVisitAt", label: "1º atendimento", get: (r) => day(r.firstVisitAt) },
    { key: "meetingsCount", label: "Atendimentos" },
    { key: "nextAppointment", label: "Próximo agendamento", get: (r) => (r.nextAppointment ? formatWhen(fromIso(r.nextAppointment.scheduledAt), now) : "") },
    { key: "approvedAt", label: "Aprovado em", get: (r) => day(r.approvedAt) },
    { key: "closedAt", label: "Fechou em", get: (r) => day(r.closedAt) },
    { key: "adesaoCents", label: "Adesão (R$)", get: (r) => centsToCsv(r.adesaoCents) },
    { key: "lostReason", label: "Motivo da perda" },
    { key: "notes", label: "Observações" },
    { key: "createdAt", label: "Cadastrado em", get: (r) => day(r.createdAt) },
  ]);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="clientes-${dayKey(now)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
