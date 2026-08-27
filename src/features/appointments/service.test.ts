import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { createTestDb } from "@/db/test-db";
import { clientInputSchema } from "@/features/clients/schema";
import { getClientDetail, listClients } from "@/features/clients/queries";
import { createClient } from "@/features/clients/service";
import { appointmentInputSchema } from "./schema";
import { listAppointmentsForDay, listOverdueAppointments, listReminders, listUpcomingAppointments } from "./queries";
import { createAppointment, deleteAppointment, setAppointmentStatus, updateAppointment } from "./service";

const now = new Date(2026, 7, 27, 14, 0);
const baseClient = clientInputSchema.parse({ name: "Ana Souza", phone: "11987654321", interest: "imovel" });

let db: Db;
let clientId: string;
beforeEach(async () => {
  db = await createTestDb();
  clientId = (await createClient(db, baseClient, now)).id;
});

function input(day: string, time: string, extra: Record<string, unknown> = {}) {
  return appointmentInputSchema.parse({ clientId, day, time, kind: "visita", ...extra });
}

describe("appointmentInputSchema", () => {
  it("validates day/time and coerces reminder", () => {
    expect(appointmentInputSchema.safeParse({ clientId, day: "2026-02-30", time: "10:00", kind: "visita" }).success).toBe(false);
    expect(appointmentInputSchema.safeParse({ clientId, day: "2026-08-27", time: "25:00", kind: "visita" }).success).toBe(false);
    const ok = appointmentInputSchema.parse({ clientId, day: "2026-08-27", time: "10:00", kind: "ligacao", reminderMinutes: "60", notes: "" });
    expect(ok.reminderMinutes).toBe(60);
    expect(ok.notes).toBeUndefined();
  });
});

describe("appointments", () => {
  it("creates, moves client to agendado and lists by day", async () => {
    const a = await createAppointment(db, input("2026-08-28", "09:30"), new Date(2026, 7, 27, 14, 1));
    expect(new Date(a.scheduledAt).getHours()).toBe(9);
    const client = await getClientDetail(db, clientId);
    expect(client?.status).toBe("agendado");
    expect(client?.activities.map((x) => x.type)).toEqual(["status", "agendamento", "cliente"]);
    expect(await listAppointmentsForDay(db, "2026-08-28")).toHaveLength(1);
    expect(await listAppointmentsForDay(db, "2026-08-29")).toHaveLength(0);
    const [item] = await listClients(db, {}, now);
    expect(item.nextAppointment?.id).toBe(a.id);
  });

  it("rejects unknown client", async () => {
    await expect(createAppointment(db, { ...input("2026-08-28", "09:30"), clientId: "nope" }, now)).rejects.toThrow("Cliente não encontrado");
  });

  it("realizado on a visita registers the visit and advances the funnel", async () => {
    const a = await createAppointment(db, input("2026-08-27", "10:00"), now);
    await setAppointmentStatus(db, a.id, "realizado", now);
    const client = await getClientDetail(db, clientId);
    expect(client?.status).toBe("visitou");
    expect(client?.firstVisitAt).toBe(new Date(2026, 7, 27, 10, 0).toISOString());
  });

  it("faltou / cancelado do not advance funnel; reschedule logs activity", async () => {
    const a = await createAppointment(db, input("2026-08-27", "10:00"), now);
    await setAppointmentStatus(db, a.id, "faltou", now);
    expect((await getClientDetail(db, clientId))?.status).toBe("agendado");
    const updated = await updateAppointment(db, a.id, input("2026-08-29", "11:00", { kind: "retorno" }), now);
    expect(updated.kind).toBe("retorno");
    const logs = (await getClientDetail(db, clientId))?.activities.map((x) => x.content) ?? [];
    expect(logs.some((l) => l.startsWith("Remarcou"))).toBe(true);
    await deleteAppointment(db, a.id);
    await expect(deleteAppointment(db, a.id)).rejects.toThrow();
  });

  it("overdue, upcoming and reminders windows", async () => {
    await createAppointment(db, input("2026-08-27", "13:00"), now); // overdue (1h ago)
    await createAppointment(db, input("2026-08-27", "13:50"), now); // inside grace: not overdue, but due
    const soon = await createAppointment(db, input("2026-08-27", "14:20", { reminderMinutes: 30 }), now); // due
    await createAppointment(db, input("2026-08-27", "16:00", { reminderMinutes: 15 }), now); // upcoming, not due
    await createAppointment(db, input("2026-08-29", "10:00"), now); // beyond 24h

    expect((await listOverdueAppointments(db, now)).map((a) => new Date(a.scheduledAt).getHours())).toEqual([13]);
    expect(await listUpcomingAppointments(db, now)).toHaveLength(3);
    const reminders = await listReminders(db, now);
    expect(reminders.find((r) => r.id === soon.id)?.due).toBe(true);
    expect(reminders.filter((r) => r.due)).toHaveLength(2);
    expect(reminders[0].clientName).toBe("Ana Souza");
  });
});
