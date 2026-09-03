import { formatDate, formatDayLong, formatTime } from "@/lib/dates";
import { ATTENDANCE_LABELS, describeInterest, type Attendance, type Interest } from "@/lib/domain";
import { capitalize } from "@/lib/text";

export type ConfirmationInput = {
  /** Nome do relacionador (perfil em Configurações). */
  consultantName: string;
  clientName: string;
  attendance: Attendance;
  /** Início do agendamento. */
  when: Date;
  interest: Interest;
  interestNotes?: string | null;
  leaderName?: string | null;
};

/**
 * Mensagem de confirmação do agendamento, no formato que o relacionador manda no WhatsApp:
 * cabeçalho, presencial/online, consultor, nome, data com dia da semana, horário, líder e observação.
 * Só texto — quem chama copia ou abre no WhatsApp.
 */
export function buildConfirmationMessage(input: ConfirmationInput): string {
  const observation = describeInterest(input.interest, input.interestNotes);
  const detail = input.interest !== "outro" && input.interestNotes?.trim() ? ` · ${input.interestNotes.trim()}` : "";
  const lines = [
    "*Agendamento*",
    ATTENDANCE_LABELS[input.attendance],
    "",
    `Consultor: ${input.consultantName.trim()}`,
    `Nome: ${input.clientName.trim()}`,
    `Data: ${capitalize(formatDayLong(input.when))} (${formatDate(input.when)})`,
    `Horário: ${formatTime(input.when)}`,
    ...(input.leaderName?.trim() ? [`Líder de vendas: ${input.leaderName.trim()}`] : []),
    `Observação: ${observation}${detail}`,
    "",
    "Me confirma por aqui, por favor.",
  ];
  return lines.join("\n");
}
