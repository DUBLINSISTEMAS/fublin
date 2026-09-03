import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { createTestDb } from "@/db/test-db";
import { toLocalInput, fromIso } from "@/lib/dates";
import { getClientDetail } from "./queries";
import { createClientWithSchedule, findNextPendingAppointment, pendingScheduleInput, updateClientWithSchedule } from "./onboarding";
import { clientInputSchema } from "./schema";

const now = new Date(2026, 7, 27, 14, 0);
const base = clientInputSchema.parse({ name: "Ana Souza", phone: "11987654321", interest: "imovel" });

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
});

describe("createClientWithSchedule", () => {
  it("creates the client and a store visit on the given day and time, moving the client to “agendado”", async () => {
    const result = await createClientWithSchedule(db, { ...base, scheduleDay: "2026-09-03", scheduleTime: "14:30", adesao: 500000, installmentMin: 80000, installmentMax: 120000 }, now);
    expect(result.scheduleError).toBeNull();
    expect(result.appointment?.kind).toBe("visita");
    expect(result.appointment?.durationMinutes).toBe(60);
    expect(toLocalInput(fromIso(result.appointment!.scheduledAt))).toEqual({ day: "2026-09-03", time: "14:30" });
    const detail = await getClientDetail(db, result.client.id);
    expect(detail?.status).toBe("agendado");
    expect(detail?.adesaoCents).toBe(500000);
    expect(detail?.installmentMinCents).toBe(80000);
    expect(detail?.installmentMaxCents).toBe(120000);
  });

  it("books an online meeting for online clients and nothing when day/time are missing", async () => {
    const online = await createClientWithSchedule(db, { ...base, phone: "11987654322", attendance: "online", scheduleDay: "2026-09-03", scheduleTime: "09:00" }, now);
    expect(online.appointment?.kind).toBe("reuniao");
    expect(online.appointment?.durationMinutes).toBe(45);
    const plain = await createClientWithSchedule(db, { ...base, phone: "11987654323" }, now);
    expect(plain.appointment).toBeNull();
    expect((await getClientDetail(db, plain.client.id))!.appointments.length).toBe(0);
  });
});

describe("updateClientWithSchedule", () => {
  it("reschedules the next pending appointment instead of creating a second one", async () => {
    const { client, appointment } = await createClientWithSchedule(db, { ...base, scheduleDay: "2026-09-03", scheduleTime: "14:30" }, now);
    const updated = await updateClientWithSchedule(db, client.id, { ...base, scheduleDay: "2026-09-04", scheduleTime: "10:00" }, now);
    expect(updated.appointment?.id).toBe(appointment!.id);
    expect(toLocalInput(fromIso(updated.appointment!.scheduledAt))).toEqual({ day: "2026-09-04", time: "10:00" });
    expect((await getClientDetail(db, client.id))!.appointments.length).toBe(1);
    expect(await pendingScheduleInput(db, client.id, now)).toEqual({ day: "2026-09-04", time: "10:00" });
  });

  it("creates the appointment when there was none and leaves the agenda alone when day/time are empty", async () => {
    const { client } = await createClientWithSchedule(db, base, now);
    const first = await updateClientWithSchedule(db, client.id, { ...base, scheduleDay: "2026-09-03", scheduleTime: "14:30" }, now);
    expect(first.appointment).not.toBeNull();
    const second = await updateClientWithSchedule(db, client.id, { ...base, name: "Ana S." }, now);
    expect(second.appointment).toBeNull();
    expect(second.client.name).toBe("Ana S.");
    expect((await findNextPendingAppointment(db, client.id, now))?.id).toBe(first.appointment!.id);
  });
});
