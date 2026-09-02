import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@/db/client";
import { createTestDb } from "@/db/test-db";
import { createLeader } from "@/features/leaders/service";
import { IDLE, OK } from "@/lib/result";
import { getClientDetail, listClients } from "./queries";

/* Infra do Next substituída por espiões: redirect vira um erro sentinela, revalidatePath só registra. */
const state = vi.hoisted(() => ({ db: null as unknown }));
vi.mock("@/db/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/db/client")>();
  return { ...actual, getDb: async () => state.db as Db };
});
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/auth/session", () => ({
  requireAdmin: vi.fn(async () => ({ id: undefined, name: "Admin", role: "admin", leaderId: null })),
  requireUser: vi.fn(async () => ({ id: undefined, name: "Admin", role: "admin", leaderId: null })),
  assertClientAccess: vi.fn(async () => undefined),
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

import { revalidatePath } from "next/cache";
import { addClientNoteAction, assignLeaderAction, createClientAction, deleteClientAction, moveClientAction, setClientStatusAction, updateClientAction } from "./actions";

function fd(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [k, v] of Object.entries(entries)) data.set(k, v);
  return data;
}

const valid = { name: "Ana Souza", phone: "11987654321", interest: "imovel", status: "novo" };

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
  state.db = db;
  vi.mocked(revalidatePath).mockClear();
});

describe("createClientAction", () => {
  it("returns field errors and echoes values on invalid input", async () => {
    const result = await createClientAction(IDLE, fd({ name: "A", phone: "1", interest: "" }));
    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.fieldErrors?.name).toBeTruthy();
      expect(result.fieldErrors?.phone).toBeTruthy();
      expect(result.fieldErrors?.interest).toBeTruthy();
      expect(result.values?.name).toBe("A");
    }
    expect(await listClients(db)).toHaveLength(0);
  });

  it("creates and redirects to the new client", async () => {
    await expect(createClientAction(IDLE, fd(valid))).rejects.toThrow(/^REDIRECT:\/clientes\/[0-9a-f-]{36}$/);
    const [created] = await listClients(db);
    expect(created.name).toBe("Ana Souza");
    expect(revalidatePath).toHaveBeenCalledWith("/clientes");
  });
});

describe("update / status / note / delete", () => {
  it("runs the full lifecycle through the action layer", async () => {
    await createClientAction(IDLE, fd(valid)).catch(() => undefined);
    const [client] = await listClients(db);

    await expect(updateClientAction(client.id, IDLE, fd({ ...valid, name: "Ana Paula", status: "negociando" }))).rejects.toThrow(`REDIRECT:/clientes/${client.id}`);
    expect(await setClientStatusAction(OK, fd({ id: client.id, status: "fechou" }))).toEqual(OK);
    expect(await setClientStatusAction(OK, fd({ id: client.id, status: "invalido" }))).toMatchObject({ ok: false });
    const note = await addClientNoteAction(IDLE, fd({ id: client.id, content: "Fechou com carta de 300 mil" }));
    expect(note.status).toBe("success");
    const empty = await addClientNoteAction(IDLE, fd({ id: client.id, content: "   " }));
    expect(empty.status).toBe("error");

    const detail = await getClientDetail(db, client.id);
    expect(detail?.name).toBe("Ana Paula");
    expect(detail?.status).toBe("fechou");
    expect(detail?.activities.map((a) => a.type)).toEqual(["nota", "status", "status", "cliente"]);

    await expect(deleteClientAction(OK, fd({ id: client.id }))).rejects.toThrow("REDIRECT:/clientes");
    expect(await getClientDetail(db, client.id)).toBeNull();
  });

  it("moves through the kanban and assigns the leader, reporting errors instead of throwing", async () => {
    const leader = await createLeader(db, { name: "Bia", phone: undefined });
    await createClientAction(IDLE, fd(valid)).catch(() => undefined);
    const [client] = await listClients(db);

    expect(await moveClientAction(client.id, "analise")).toEqual(OK);
    expect(await moveClientAction(client.id, "nope")).toEqual({ ok: false, error: "Status inválido." });
    expect(await moveClientAction("missing", "analise")).toEqual({ ok: false, error: "Cliente não encontrado." });

    expect(await assignLeaderAction(OK, fd({ id: client.id, leaderId: leader.id }))).toEqual(OK);
    expect(await assignLeaderAction(OK, fd({ id: client.id, leaderId: "ghost" }))).toEqual({ ok: false, error: "Líder não encontrado." });
    expect((await getClientDetail(db, client.id))?.leader?.name).toBe("Bia");
  });

  it("maps domain errors to a visible result instead of throwing", async () => {
    const result = await updateClientAction("nope", IDLE, fd(valid));
    expect(result).toMatchObject({ status: "error", message: "Cliente não encontrado." });
    const note = await addClientNoteAction(IDLE, fd({ id: "nope", content: "x" }));
    expect(note).toMatchObject({ status: "error", message: "Cliente não encontrado." });
    expect(await deleteClientAction(OK, fd({ id: "nope" }))).toEqual({ ok: false, error: "Cliente não encontrado." });
    expect(await deleteClientAction(OK, fd({ id: "" }))).toMatchObject({ ok: false });
    expect(await setClientStatusAction(OK, fd({ id: "nope", status: "fechou" }))).toEqual({ ok: false, error: "Cliente não encontrado." });
  });
});
