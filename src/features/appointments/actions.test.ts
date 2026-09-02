import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/features/auth/session", () => ({ requireAdmin: vi.fn(async () => ({ id: "admin", role: "admin" })) }));
import type { Db } from "@/db/client";
import { createTestDb } from "@/db/test-db";
import { clientInputSchema } from "@/features/clients/schema";
import { getClientDetail } from "@/features/clients/queries";
import { createClient } from "@/features/clients/service";
import { IDLE, OK } from "@/lib/result";
import { listAppointmentsForDay } from "./queries";

const state = vi.hoisted(() => ({ db: null as unknown }));
vi.mock("@/db/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/db/client")>();
  return { ...actual, getDb: async () => state.db as Db };
});
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

import { createAppointmentAction, deleteAppointmentAction, setAppointmentStatusAction, updateAppointmentAction } from "./actions";

function fd(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [k, v] of Object.entries(entries)) data.set(k, v);
  return data;
}

let db: Db;
let clientId: string;
beforeEach(async () => {
  db = await createTestDb();
  state.db = db;
  clientId = (await createClient(db, clientInputSchema.parse({ name: "Ana", phone: "11987654321", interest: "imovel" }))).id;
});

describe("appointment actions", () => {
  it("validates and redirects to the agenda day by default, or to the client with returnTo", async () => {
    const invalid = await createAppointmentAction(IDLE, fd({ clientId, day: "2026-02-30", time: "10:00", kind: "visita" }));
    expect(invalid.status).toBe("error");

    await expect(createAppointmentAction(IDLE, fd({ clientId, day: "2026-08-28", time: "10:00", kind: "visita" }))).rejects.toThrow("REDIRECT:/agenda?d=2026-08-28");
    await expect(createAppointmentAction(IDLE, fd({ clientId, day: "2026-08-29", time: "11:00", kind: "ligacao", returnTo: "cliente" }))).rejects.toThrow(`REDIRECT:/clientes/${clientId}`);
    expect(await listAppointmentsForDay(db, "2026-08-28")).toHaveLength(1);
    expect((await getClientDetail(db, clientId))?.status).toBe("agendado");
  });

  it("updates, sets status and deletes through the action layer", async () => {
    await createAppointmentAction(IDLE, fd({ clientId, day: "2026-08-28", time: "10:00", kind: "visita" })).catch(() => undefined);
    const [appointment] = await listAppointmentsForDay(db, "2026-08-28");

    await expect(updateAppointmentAction(appointment.id, IDLE, fd({ clientId, day: "2026-08-30", time: "09:00", kind: "retorno", returnTo: "cliente" }))).rejects.toThrow(`REDIRECT:/clientes/${clientId}`);
    expect(await listAppointmentsForDay(db, "2026-08-30")).toHaveLength(1);

    expect(await setAppointmentStatusAction(OK, fd({ id: appointment.id, status: "realizado" }))).toEqual(OK);
    expect(await setAppointmentStatusAction(OK, fd({ id: appointment.id, status: "nope" }))).toEqual({ ok: false, error: "Status inválido." });
    const [updated] = await listAppointmentsForDay(db, "2026-08-30");
    expect(updated.status).toBe("realizado");

    await expect(deleteAppointmentAction(OK, fd({ id: appointment.id }))).rejects.toThrow(`REDIRECT:/clientes/${clientId}`);
    expect(await listAppointmentsForDay(db, "2026-08-30")).toHaveLength(0);
    expect(await deleteAppointmentAction(OK, fd({ id: appointment.id }))).toEqual({ ok: false, error: "Agendamento não encontrado." });
    expect(await deleteAppointmentAction(OK, fd({}))).toMatchObject({ ok: false });
  });

  it("turns a missing client into a form error", async () => {
    const result = await createAppointmentAction(IDLE, fd({ clientId: "nope", day: "2026-08-28", time: "10:00", kind: "visita" }));
    expect(result).toMatchObject({ status: "error", message: "Cliente não encontrado." });
    expect(await setAppointmentStatusAction(OK, fd({ id: "nope", status: "realizado" }))).toEqual({ ok: false, error: "Agendamento não encontrado." });
  });
});
