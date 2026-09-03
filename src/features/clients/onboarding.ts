import { and, asc, eq, gte } from "drizzle-orm";
import type { Db } from "@/db/client";
import { appointments, type Appointment, type Client } from "@/db/schema";
import { fromLocalInput, toIso, toLocalInput, fromIso } from "@/lib/dates";
import { ATTENDANCE_APPOINTMENT_KIND, DEFAULT_DURATION_BY_KIND, DEFAULT_REMINDER_MINUTES } from "@/lib/domain";
import { createAppointment, rescheduleAppointment } from "@/features/appointments/service";
import type { ClientInput } from "./schema";
import { createClient, updateClient } from "./service";

/**
 * Cadastro e agenda num passo só. Fica fora de `service.ts` porque o serviço de
 * agendamentos já importa o de clientes (evita ciclo de imports).
 */

export type OnboardingResult = {
  client: Client;
  appointment: Appointment | null;
  /** O cliente foi salvo, mas o agendamento não: mensagem para o dono marcar de novo. */
  scheduleError: string | null;
};

/** Próximo agendamento pendente do cliente (o que o formulário de edição mostra e remarca). */
export async function findNextPendingAppointment(db: Db, clientId: string, now: Date = new Date()): Promise<Appointment | null> {
  const row = await db.query.appointments.findFirst({
    where: and(eq(appointments.clientId, clientId), eq(appointments.status, "agendado"), gte(appointments.scheduledAt, toIso(now))),
    orderBy: [asc(appointments.scheduledAt)],
  });
  return row ?? null;
}

/** Dia e hora locais do próximo pendente, prontos para os inputs do formulário. */
export async function pendingScheduleInput(db: Db, clientId: string, now: Date = new Date()): Promise<{ day: string; time: string } | null> {
  const next = await findNextPendingAppointment(db, clientId, now);
  return next ? toLocalInput(fromIso(next.scheduledAt)) : null;
}

function scheduleOf(input: ClientInput): { day: string; time: string } | null {
  return input.scheduleDay && input.scheduleTime ? { day: input.scheduleDay, time: input.scheduleTime } : null;
}

async function scheduleForClient(db: Db, client: Client, schedule: { day: string; time: string }, now: Date): Promise<Appointment> {
  const kind = ATTENDANCE_APPOINTMENT_KIND[client.attendance];
  return createAppointment(
    db,
    { clientId: client.id, day: schedule.day, time: schedule.time, kind, durationMinutes: DEFAULT_DURATION_BY_KIND[kind], reminderMinutes: DEFAULT_REMINDER_MINUTES, notes: undefined },
    now,
  );
}

const scheduleMessage = (error: unknown) => (error instanceof Error ? error.message : "Erro ao agendar.");

/** Cria o cliente e, se veio dia e hora, o agendamento (visita à loja ou reunião online). */
export async function createClientWithSchedule(db: Db, input: ClientInput, now: Date = new Date()): Promise<OnboardingResult> {
  const client = await createClient(db, input, now);
  const schedule = scheduleOf(input);
  if (!schedule) return { client, appointment: null, scheduleError: null };
  try {
    return { client, appointment: await scheduleForClient(db, client, schedule, now), scheduleError: null };
  } catch (error) {
    console.error("[clientes] cliente salvo, agendamento falhou", error);
    return { client, appointment: null, scheduleError: scheduleMessage(error) };
  }
}

/**
 * Atualiza o cliente e cuida da agenda: dia/hora remarcam o próximo pendente (ou criam um,
 * se não há); campos vazios não mexem na agenda — cancelar continua sendo na agenda.
 */
export async function updateClientWithSchedule(db: Db, id: string, input: ClientInput, now: Date = new Date()): Promise<OnboardingResult> {
  const client = await updateClient(db, id, input, now);
  const schedule = scheduleOf(input);
  if (!schedule) return { client, appointment: null, scheduleError: null };
  try {
    const pending = await findNextPendingAppointment(db, id, now);
    const when = fromLocalInput(schedule.day, schedule.time);
    const appointment = pending ? await rescheduleAppointment(db, pending.id, when, now) : await scheduleForClient(db, client, schedule, now);
    return { client, appointment, scheduleError: null };
  } catch (error) {
    console.error("[clientes] cliente salvo, agendamento falhou", error);
    return { client, appointment: null, scheduleError: scheduleMessage(error) };
  }
}
