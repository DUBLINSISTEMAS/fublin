import type { AppointmentKind, AppointmentStatus, ClientPriority } from "@/lib/domain";
import type { AppointmentWithClient } from "../../queries";

/** Agendamento achatado e serializável para os componentes cliente da agenda. */
export type CalendarEvent = {
  id: string;
  clientId: string;
  clientName: string;
  priority: ClientPriority;
  phone: string;
  leaderName: string | null;
  leaderPhotoKey: string | null;
  kind: AppointmentKind;
  status: AppointmentStatus;
  /** ISO UTC. */
  start: string;
  durationMinutes: number;
  notes: string | null;
  interestNotes: string | null;
};

export function toCalendarEvent(a: AppointmentWithClient): CalendarEvent {
  return {
    id: a.id,
    clientId: a.clientId,
    clientName: a.client.name,
    priority: a.client.priority,
    phone: a.client.phone,
    leaderName: a.client.leader?.name ?? null,
    leaderPhotoKey: a.client.leader?.photoKey ?? null,
    kind: a.kind,
    status: a.status,
    start: a.scheduledAt,
    durationMinutes: a.durationMinutes,
    notes: a.notes,
    interestNotes: a.client.interestNotes,
  };
}

export type CalendarView = "dia" | "semana" | "mes";
export const CALENDAR_VIEWS: readonly CalendarView[] = ["dia", "semana", "mes"];
export const CALENDAR_VIEW_LABELS: Record<CalendarView, string> = { dia: "Dia", semana: "Semana", mes: "Mês" };

export function isCalendarView(value: string | undefined): value is CalendarView {
  return (CALENDAR_VIEWS as readonly string[]).includes(value ?? "");
}
