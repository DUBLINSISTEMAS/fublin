import { ATTENDANCE_KINDS, type AppointmentKind, type AppointmentStatus } from "@/lib/domain";

/**
 * Numeração dos encontros de um cliente: a 1ª visita, a 2ª, a 3ª…
 *
 * "Encontro" é só visita à loja e reunião online (`ATTENDANCE_KINDS`) — ligação e
 * retorno são contatos, não atendimentos. Cancelados saem da conta: se a 2ª visita
 * foi desmarcada, a próxima volta a ser a 2ª. Quem faltou continua contando, porque
 * a tentativa aconteceu.
 */

/** O mínimo para numerar um agendamento. */
export type MeetingItem = { id: string; kind: AppointmentKind; status: AppointmentStatus; scheduledAt: string };
/** O mínimo para saber se um agendamento é um encontro (e se já foi feito). */
export type MeetingKind = Pick<MeetingItem, "kind" | "status">;

export function isMeeting(a: MeetingKind): boolean {
  return ATTENDANCE_KINDS.includes(a.kind) && a.status !== "cancelado";
}

/** Encontro que já aconteceu — é o que alimenta "atendimentos realizados". */
export function isMeetingDone(a: MeetingKind): boolean {
  return a.status === "realizado" && ATTENDANCE_KINDS.includes(a.kind);
}

/** Encontros que ainda valem, do mais antigo para o mais novo. */
export function meetingOrder<T extends MeetingItem>(all: T[]): T[] {
  return all.filter(isMeeting).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt) || a.id.localeCompare(b.id));
}

/** Quantos encontros o cliente tem marcados (realizados, faltados e por vir). */
export function countMeetings(all: MeetingKind[]): number {
  return all.filter(isMeeting).length;
}

export function countMeetingsDone(all: MeetingKind[]): number {
  return all.filter(isMeetingDone).length;
}

/** Qual encontro este agendamento é para o cliente — `null` se não for visita nem reunião. */
export function meetingNumber(all: MeetingItem[], id: string): number | null {
  const position = meetingOrder(all).findIndex((a) => a.id === id);
  return position === -1 ? null : position + 1;
}

/** Ordinal curto para caber no card: "3ª". */
export function meetingOrdinal(position: number): string {
  return `${position}ª`;
}

/** Texto por extenso: "3ª visita à loja", "2ª reunião online". */
export function meetingLabel(position: number, kind: AppointmentKind): string {
  return `${meetingOrdinal(position)} ${kind === "reuniao" ? "reunião online" : "visita à loja"}`;
}
