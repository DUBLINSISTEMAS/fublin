import { and, asc, between, eq, gte, lt, lte } from "drizzle-orm";
import { addHours, addMinutes } from "date-fns";
import type { Db } from "@/db/client";
import { appointments, type Appointment, type Client } from "@/db/schema";
import { dayBounds, isReminderDue, REMINDER_GRACE_MINUTES, toIso, type DayKey } from "@/lib/dates";

export type AppointmentWithClient = Appointment & { client: Client };

export async function listAppointmentsForDay(db: Db, day: DayKey): Promise<AppointmentWithClient[]> {
  const { start, end } = dayBounds(day);
  return db.query.appointments.findMany({
    where: between(appointments.scheduledAt, toIso(start), toIso(end)),
    orderBy: [asc(appointments.scheduledAt)],
    with: { client: true },
  });
}

/** Agendados no passado sem baixa (o usuário precisa marcar realizado/faltou). */
export async function listOverdueAppointments(db: Db, now: Date, limit = 50): Promise<AppointmentWithClient[]> {
  return db.query.appointments.findMany({
    where: and(eq(appointments.status, "agendado"), lt(appointments.scheduledAt, toIso(addMinutes(now, -REMINDER_GRACE_MINUTES)))),
    orderBy: [asc(appointments.scheduledAt)],
    with: { client: true },
    limit,
  });
}

/** Próximos agendados dentro de N horas a partir de agora (inclui a janela de tolerância). */
export async function listUpcomingAppointments(db: Db, now: Date, hours = 24): Promise<AppointmentWithClient[]> {
  return db.query.appointments.findMany({
    where: and(
      eq(appointments.status, "agendado"),
      gte(appointments.scheduledAt, toIso(addMinutes(now, -REMINDER_GRACE_MINUTES))),
      lte(appointments.scheduledAt, toIso(addHours(now, hours))),
    ),
    orderBy: [asc(appointments.scheduledAt)],
    with: { client: true },
  });
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
