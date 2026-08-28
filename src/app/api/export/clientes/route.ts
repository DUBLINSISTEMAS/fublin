import { getDb } from "@/db/client";
import { listClients, type ClientListItem } from "@/features/clients/queries";
import { dayKey } from "@/lib/dates";
import { APPOINTMENT_KIND_LABELS, ATTENDANCE_LABELS, CLIENT_STATUS_LABELS, INTEREST_LABELS, labelOf, SOURCE_LABELS } from "@/lib/domain";
import { formatPhone } from "@/lib/phone";
import { buildWorkbook, xlsxResponse, type XlsxColumn } from "@/lib/xlsx";

export const dynamic = "force-dynamic";

const COLUMNS: XlsxColumn<ClientListItem>[] = [
  { label: "Nome", type: "text", width: 28, get: (r) => r.name },
  { label: "Telefone", type: "text", width: 16, get: (r) => formatPhone(r.phone) },
  { label: "E-mail", type: "text", width: 26, get: (r) => r.email },
  { label: "Interesse", type: "text", width: 12, get: (r) => INTEREST_LABELS[r.interest] },
  { label: "Detalhe do interesse", type: "text", width: 28, get: (r) => r.interestNotes },
  { label: "Carta (R$)", type: "money", get: (r) => r.creditCents },
  { label: "Etapa", type: "text", width: 14, get: (r) => CLIENT_STATUS_LABELS[r.status] },
  { label: "Atendimento", type: "text", width: 14, get: (r) => ATTENDANCE_LABELS[r.attendance] },
  { label: "Origem", type: "text", width: 14, get: (r) => labelOf(SOURCE_LABELS, r.source) },
  { label: "Líder de vendas", type: "text", width: 22, get: (r) => r.leader?.name },
  { label: "1º atendimento", type: "date", width: 14, get: (r) => r.firstVisitAt },
  { label: "Atendimentos feitos", type: "integer", width: 13, get: (r) => r.meetingsCount },
  { label: "Encontros marcados", type: "integer", width: 13, get: (r) => r.meetingsTotal },
  { label: "Próximo agendamento", type: "datetime", width: 20, get: (r) => r.nextAppointment?.scheduledAt },
  { label: "Tipo do próximo", type: "text", width: 16, get: (r) => (r.nextAppointment ? APPOINTMENT_KIND_LABELS[r.nextAppointment.kind] : null) },
  { label: "Nº do encontro", type: "integer", width: 13, get: (r) => r.nextAppointment?.meetingNumber },
  { label: "Aprovado em", type: "date", get: (r) => r.approvedAt },
  { label: "Fechou em", type: "date", get: (r) => r.closedAt },
  { label: "Adesão (R$)", type: "money", get: (r) => r.adesaoCents },
  { label: "Motivo da perda", type: "text", width: 28, get: (r) => r.lostReason },
  { label: "Observações", type: "text", width: 40, get: (r) => r.notes },
  { label: "Cadastrado em", type: "date", width: 14, get: (r) => r.createdAt },
];

/** Exporta todos os clientes em Excel (.xlsx), com as colunas do funil v2. */
export async function GET() {
  const db = await getDb();
  const now = new Date();
  const rows = await listClients(db, {}, now);
  const buffer = await buildWorkbook({ sheetName: "Clientes", columns: COLUMNS, rows });
  return xlsxResponse(buffer, `clientes-${dayKey(now)}.xlsx`);
}
