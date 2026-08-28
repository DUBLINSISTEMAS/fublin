import { and, asc, between, eq, gte, lt, lte, ne } from "drizzle-orm";
import { addHours, addMinutes } from "date-fns";
import type { Db } from "@/db/client";
import { appointments, type Appointment, type Client, type Leader } from "@/db/schema";
import { dayBounds, dayKey, fromIso, isReminderDue, REMINDER_GRACE_MINUTES, toIso, type DayKey } from "@/lib/dates";
import { meetingNumber, type MeetingItem } from "./sequence";

export type AppointmentWithClient = Appointment & {
  client: Client & { leader: Leader | null };
  /** Qual encontro este é para o cliente (1ª, 2ª, 3ª visita/reunião); `null` em ligação e retorno. */
  meetingNumber: number | null;
};

/** Junto do cliente vêm os irmãos dele, só com o necessário para numerar os encontros. */
const WITH_CLIENT = { client: { with: { leader: true, appointments: { columns: { id: true, kind: true, status: true, scheduledAt: true } } } } } as const;

type RowWithClient = Appointment & { client: Client & { leader: Leader | null; appointments: MeetingItem[] } };

/** Troca a lista de irmãos pelo número do encontro: quem consome o tipo não precisa recalcular. */
function withMeetingNumber(rows: RowWithClient[]): AppointmentWithClient[] {
  return rows.map(({ client: { appointments: siblings, ...client }, ...appointment }) => ({
    ...appointment,
    client,
    meetingNumber: meetingNumber(siblings, appointment.id),
  }));
}

export async function listAppointmentsForDay(db: Db, day: DayKey): Promise<AppointmentWithClient[]> {
  const { start, end } = dayBounds(day);
  return withMeetingNumber(
    await db.query.appointments.findMany({
      where: between(appointments.scheduledAt, toIso(start), toIso(end)),
      orderBy: [asc(appointments.scheduledAt)],
      with: WITH_CLIENT,
    }),
  );
}

/** Agendamentos com início em [start, end) — a agenda de uma semana ou de um mês. */
export async function listAppointmentsBetween(db: Db, start: Date, end: Date): Promise<AppointmentWithClient[]> {
  return withMeetingNumber(
    await db.query.appointments.findMany({
      where: and(gte(appointments.scheduledAt, toIso(start)), lt(appointments.scheduledAt, toIso(end))),
      orderBy: [asc(appointments.scheduledAt)],
      with: WITH_CLIENT,
    }),
  );
}

/** Quantos agendamentos (exceto cancelados) por dia em [start, end) — os pontinhos do mini-calendário. */
export async function countAppointmentsByDay(db: Db, start: Date, end: Date): Promise<Record<DayKey, number>> {
  const rows = await db
    .select({ at: appointments.scheduledAt })
    .from(appointments)
    .where(and(gte(appointments.scheduledAt, toIso(start)), lt(appointments.scheduledAt, toIso(end)), ne(appointments.status, "cancelado")));
  const counts: Record<DayKey, number> = {};
  for (const r of rows) {
    const key = dayKey(fromIso(r.at));
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

/** Agendados no passado sem baixa (o usuário precisa marcar realizado/faltou). */
export async function listOverdueAppointments(db: Db, now: Date, limit = 50): Promise<AppointmentWithClient[]> {
  return withMeetingNumber(
    await db.query.appointments.findMany({
      where: and(eq(appointments.status, "agendado"), lt(appointments.scheduledAt, toIso(addMinutes(now, -REMINDER_GRACE_MINUTES)))),
      orderBy: [asc(appointments.scheduledAt)],
      with: WITH_CLIENT,
      limit,
    }),
  );
}

/** Próximos agendados dentro de N horas a partir de agora (inclui a janela de tolerância). */
export async function listUpcomingAppointments(db: Db, now: Date, hours = 24): Promise<AppointmentWithClient[]> {
  return withMeetingNumber(
    await db.query.appointments.findMany({
      where: and(
        eq(appointments.status, "agendado"),
        gte(appointments.scheduledAt, toIso(addMinutes(now, -REMINDER_GRACE_MINUTES))),
        lte(appointments.scheduledAt, toIso(addHours(now, hours))),
      ),
      orderBy: [asc(appointments.scheduledAt)],
      with: WITH_CLIENT,
    }),
  );
}

export type ReminderItem = {
  id: string;
  clientId: string;
  clientName: string;
  scheduledAt: string;
  kind: Appointment["kind"];
  reminderMinutes: number;
  due: boolean;
};

/** Lista para o watcher do navegador: o que está por vir e o que já deve disparar. */
export async function listReminders(db: Db, now: Date): Promise<ReminderItem[]> {
  const rows = await listUpcomingAppointments(db, now, 24);
  return rows.map((a) => ({
    id: a.id,
    clientId: a.clientId,
    clientName: a.client.name,
    scheduledAt: a.scheduledAt,
    kind: a.kind,
    reminderMinutes: a.reminderMinutes,
    due: isReminderDue(new Date(a.scheduledAt), a.reminderMinutes, now),
  }));
}
