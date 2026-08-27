import { getDb } from "@/db/client";
import { listClients } from "@/features/clients/queries";
import { toCsv } from "@/lib/csv";
import { dayKey, formatDate, formatWhen, fromIso } from "@/lib/dates";
import { CLIENT_STATUS_LABELS, INTEREST_LABELS, labelOf, SOURCE_LABELS } from "@/lib/domain";
import { formatPhone } from "@/lib/phone";

export const dynamic = "force-dynamic";

/** Exporta todos os clientes em CSV (Excel pt-BR). */
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
    { key: "status", label: "Status", get: (r) => CLIENT_STATUS_LABELS[r.status] },
    { key: "source", label: "Origem", get: (r) => labelOf(SOURCE_LABELS, r.source) },
    { key: "leader", label: "Líder de vendas", get: (r) => r.leader?.name ?? "" },
    { key: "firstVisitAt", label: "Veio à loja em", get: (r) => (r.firstVisitAt ? formatDate(fromIso(r.firstVisitAt)) : "") },
    { key: "nextAppointment", label: "Próximo agendamento", get: (r) => (r.nextAppointment ? formatWhen(fromIso(r.nextAppointment.scheduledAt), now) : "") },
    { key: "notes", label: "Observações" },
    { key: "createdAt", label: "Cadastrado em", get: (r) => formatDate(fromIso(r.createdAt)) },
  ]);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="clientes-${dayKey(now)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
