import { eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { appointments, type Appointment } from "@/db/schema";
import { formatDate, formatTime, fromIso, fromLocalInput, toIso } from "@/lib/dates";
import { APPOINTMENT_KIND_LABELS, APPOINTMENT_STATUS_LABELS, ATTENDANCE_KINDS, type AppointmentStatus } from "@/lib/domain";
import { newId } from "@/lib/ids";
import { DomainError } from "@/lib/result";
import { logActivity } from "@/features/activities/service";
import { getClient, markScheduled, registerAttendance } from "@/features/clients/service";
import type { AppointmentInput } from "./schema";

function describe(kind: Appointment["kind"], when: Date): string {
  return `${APPOINTMENT_KIND_LABELS[kind]} em ${formatDate(when)} às ${formatTime(when)}`;
}

export async function getAppointment(db: Db, id: string): Promise<Appointment> {
  const row = await db.query.appointments.findFirst({ where: eq(appointments.id, id) });
  if (!row) throw new DomainError("Agendamento não encontrado.");
  return row;
}

export async function createAppointment(db: Db, input: AppointmentInput, now: Date = new Date()): Promise<Appointment> {
  await getClient(db, input.clientId);
  const when = fromLocalInput(input.day, input.time);
  const iso = toIso(now);
  const row: Appointment = {
    id: newId(),
    clientId: input.clientId,
    scheduledAt: toIso(when),
    kind: input.kind,
    status: "agendado",
    notes: input.notes ?? null,
    reminderMinutes: input.reminderMinutes,
    createdAt: iso,
    updatedAt: iso,
  };
  await db.insert(appointments).values(row);
  await logActivity(db, row.clientId, "agendamento", `Agendou: ${describe(row.kind, when)}`, now);
  await markScheduled(db, row.clientId, now);
  return row;
}

export async function updateAppointment(db: Db, id: string, input: AppointmentInput, now: Date = new Date()): Promise<Appointment> {
  const before = await getAppointment(db, id);
  const when = fromLocalInput(input.day, input.time);
  const [updated] = await db
    .update(appointments)
    .set({
      clientId: input.clientId,
      scheduledAt: toIso(when),
      kind: input.kind,
      notes: input.notes ?? null,
      reminderMinutes: input.reminderMinutes,
      updatedAt: toIso(now),
    })
    .where(eq(appointments.id, id))
    .returning();
  if (before.scheduledAt !== updated.scheduledAt || before.kind !== updated.kind) {
    await logActivity(db, updated.clientId, "agendamento", `Remarcou: ${describe(updated.kind, when)}`, now);
  }
  return updated;
}

/** Dá baixa no agendamento e reflete no funil do cliente. */
export async function setAppointmentStatus(db: Db, id: string, status: AppointmentStatus, now: Date = new Date()): Promise<Appointment> {
  const before = await getAppointment(db, id);
  if (before.status === status) return before;
  const [updated] = await db
    .update(appointments)
    .set({ status, updatedAt: toIso(now) })
    .where(eq(appointments.id, id))
    .returning();
  const when = fromIso(updated.scheduledAt);
  await logActivity(db, updated.clientId, "agendamento", `${APPOINTMENT_STATUS_LABELS[status]}: ${describe(updated.kind, when)}`, now);
  if (status === "realizado" && ATTENDANCE_KINDS.includes(updated.kind)) await registerAttendance(db, updated.clientId, when, now);
  return updated;
}

export async function deleteAppointment(db: Db, id: string): Promise<void> {
  const deleted = await db.delete(appointments).where(eq(appointments.id, id)).returning({ id: appointments.id });
  if (deleted.length === 0) throw new DomainError("Agendamento não encontrado.");
}
