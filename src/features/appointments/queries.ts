import { and, asc, between, eq, gte, lt, lte, ne } from "drizzle-orm";
import { addHours, addMinutes } from "date-fns";
import type { Db } from "@/db/client";
import { appointments, type Appointment, type Client, type Leader } from "@/db/schema";
import { dayBounds, dayKey, fromIso, isReminderDue, REMINDER_GRACE_MINUTES, shiftDayKey, toIso, type DayKey } from "@/lib/dates";

export type AppointmentWithClient = Appointment & { client: Client & { leader: Leader | null } };

const WITH_CLIENT = { client: { with: { leader: true } } } as const;

export async function listAppointmentsForDay(db: Db, day: DayKey): Promise<AppointmentWithClient[]> {
  const { start, end } = dayBounds(day);
  return db.query.appointments.findMany({
    where: between(appointments.scheduledAt, toIso(start), toIso(end)),
    orderBy: [asc(appointments.scheduledAt)],
    with: WITH_CLIENT,
  });
}

/** Agendados no passado sem baixa (o usuário precisa marcar realizado/faltou). */
export async function listOverdueAppointments(db: Db, now: Date, limit = 50): Promise<AppointmentWithClient[]> {
  return db.query.appointments.findMany({
    where: and(eq(appointments.status, "agendado"), lt(appointments.scheduledAt, toIso(addMinutes(now, -REMINDER_GRACE_MINUTES)))),
    orderBy: [asc(appointments.scheduledAt)],
    with: WITH_CLIENT,
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
    with: WITH_CLIENT,
  });
}

/** Horário comercial; agendamentos fora dele caem na primeira/última linha. */
const HEATMAP_HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18] as const;

export type ActivityHeatmap = {
  days: { day: DayKey; label: string }[];
  hours: number[];
  /** cells[hourIndex][dayIndex] */
  cells: number[][];
  max: number;
};

/** Agendamentos (exceto cancelados) por hora × dia nos últimos N dias, inclusive hoje. */
export async function getActivityHeatmap(db: Db, now: Date, days = 14): Promise<ActivityHeatmap> {
  const firstDay = shiftDayKey(dayKey(now), -(days - 1));
  const startIso = toIso(dayBounds(firstDay).start);
  const rows = await db
    .select({ at: appointments.scheduledAt })
    .from(appointments)
    .where(and(gte(appointments.scheduledAt, startIso), ne(appointments.status, "cancelado")));

  const dayList = Array.from({ length: days }, (_, i) => {
    const day = shiftDayKey(firstDay, i);
    return { day, label: String(Number(day.slice(8, 10))) };
  });
  const dayIndex = new Map(dayList.map((d, i) => [d.day, i]));
  const hours: number[] = [...HEATMAP_HOURS];
  const counts = new Map<string, number>();
  for (const r of rows) {
    const at = fromIso(r.at);
    const di = dayIndex.get(dayKey(at));
    const hi = hours.indexOf(Math.min(Math.max(at.getHours(), hours[0]), hours[hours.length - 1]));
    if (di === undefined || hi < 0) continue;
    const key = `${hi}:${di}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const cells = hours.map((_, hi) => dayList.map((_, di) => counts.get(`${hi}:${di}`) ?? 0));
  const max = Math.max(0, ...cells.flat());
  return { days: dayList, hours, cells, max };
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
