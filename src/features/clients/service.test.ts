import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { createTestDb } from "@/db/test-db";
import { createLeader } from "@/features/leaders/service";
import { clientInputSchema } from "./schema";
import { countClientsByStatus, getClientDetail, getDailySeries, getMonthStats, listClients, parseClientFilters } from "./queries";
import { addClientNote, createClient, deleteClient, registerVisit, setClientStatus, STATUS_ARROW, updateClient } from "./service";

const now = new Date(2026, 7, 27, 14, 0);

const base = clientInputSchema.parse({ name: "Ana Souza", phone: "11987654321", interest: "imovel" });

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
});

describe("clientInputSchema", () => {
  it("rejects missing name / bad phone / bad email", () => {
    const r = clientInputSchema.safeParse({ name: "A", phone: "123", interest: "imovel", email: "x" });
    expect(r.success).toBe(false);
  });
  it("turns empty optional strings into undefined and defaults status", () => {
    const r = clientInputSchema.parse({ name: "Ana", phone: "(11) 98765-4321", interest: "moto", email: "", leaderId: "", firstVisitDay: "" });
    expect(r.email).toBeUndefined();
    expect(r.leaderId).toBeUndefined();
    expect(r.status).toBe("novo");
  });
});

describe("client lifecycle", () => {
  it("creates with timeline entry and reads detail", async () => {
    const leader = await createLeader(db, { name: "Carlos", phone: undefined }, now);
    const created = await createClient(db, { ...base, leaderId: leader.id, firstVisitDay: "2026-08-20" }, now);
    const detail = await getClientDetail(db, created.id);
    expect(detail?.leader?.name).toBe("Carlos");
    expect(detail?.firstVisitAt).toBeTruthy();
    expect(detail?.activities.map((a) => a.type)).toEqual(["cliente"]);
  });

  it("logs status changes on update and explicit status set", async () => {
    const c = await createClient(db, base, now);
    await updateClient(db, c.id, { ...base, status: "negociando" }, now);
    await setClientStatus(db, c.id, "fechou", now);
    await setClientStatus(db, c.id, "fechou", now); // no-op
    const detail = await getClientDetail(db, c.id);
    expect(detail?.status).toBe("fechou");
    const statusLogs = detail?.activities.filter((a) => a.type === "status") ?? [];
    expect(statusLogs).toHaveLength(2);
    expect(statusLogs.map((l) => l.content)).toContain(`Status: Em negociação ${STATUS_ARROW} Fechou`);
  });

  it("registerVisit advances only novo/agendado and keeps first visit date", async () => {
    const c = await createClient(db, base, now);
    const visit = new Date(2026, 7, 27, 10, 0);
    const after = await registerVisit(db, c.id, visit, now);
    expect(after.status).toBe("visitou");
    expect(after.firstVisitAt).toBe(visit.toISOString());
    await setClientStatus(db, c.id, "negociando", now);
    const again = await registerVisit(db, c.id, new Date(2026, 7, 28, 10, 0), now);
    expect(again.status).toBe("negociando");
    expect(again.firstVisitAt).toBe(visit.toISOString());
  });

  it("adds notes and deletes (cascade)", async () => {
    const c = await createClient(db, base, now);
    await addClientNote(db, c.id, "Prefere contato à tarde", new Date(2026, 7, 27, 15, 0));
    expect((await getClientDetail(db, c.id))?.activities[0].content).toBe("Prefere contato à tarde");
    await deleteClient(db, c.id);
    expect(await getClientDetail(db, c.id)).toBeNull();
    await expect(deleteClient(db, c.id)).rejects.toThrow("Cliente não encontrado");
  });
});

describe("listClients filters", () => {
  it("filters by text (name or phone digits), status group, interest and leader", async () => {
    const leader = await createLeader(db, { name: "Bia", phone: undefined }, now);
    await createClient(db, { ...base, name: "Ana Souza", phone: "11987654321" }, now);
    await createClient(db, { ...base, name: "Bruno Lima", phone: "21999990000", interest: "automovel", leaderId: leader.id, status: "fechou" }, now);

    expect((await listClients(db, { q: "ana" }, now)).map((c) => c.name)).toEqual(["Ana Souza"]);
    expect((await listClients(db, { q: "(21) 9999" }, now)).map((c) => c.name)).toEqual(["Bruno Lima"]);
    expect((await listClients(db, { status: "abertos" }, now)).map((c) => c.name)).toEqual(["Ana Souza"]);
    expect((await listClients(db, { interest: "automovel" }, now)).map((c) => c.name)).toEqual(["Bruno Lima"]);
    expect((await listClients(db, { leaderId: leader.id }, now)).map((c) => c.name)).toEqual(["Bruno Lima"]);
    expect(await listClients(db, {}, now)).toHaveLength(2);
  });

  it("parses filters from URL and ignores invalid values", () => {
    expect(parseClientFilters({ q: " ana ", status: "abertos", interesse: "nope", lider: "x" })).toEqual({ q: "ana", status: "abertos", interest: undefined, leaderId: "x" });
    expect(parseClientFilters({ status: ["fechou"] }).status).toBe("fechou");
  });

  it("counts by status and month stats", async () => {
    await createClient(db, base, now);
    await createClient(db, { ...base, status: "fechou" }, now);
    const counts = await countClientsByStatus(db);
    expect(counts.novo).toBe(1);
    expect(counts.fechou).toBe(1);
    const stats = await getMonthStats(db, new Date(2026, 7, 1));
    expect(stats).toEqual({ newClients: 2, visits: 0, closed: 1 });
    const previous = await getMonthStats(db, new Date(2026, 6, 1), new Date(2026, 7, 1));
    expect(previous).toEqual({ newClients: 0, visits: 0, closed: 0 });
  });

  it("builds a 7-day series ending today", async () => {
    await createClient(db, base, now);
    await createClient(db, base, new Date(2026, 7, 25, 9, 0));
    await createClient(db, base, new Date(2026, 7, 1, 9, 0)); // fora da janela
    const series = await getDailySeries(db, now, 7);
    expect(series).toHaveLength(7);
    expect(series[6]).toMatchObject({ day: "2026-08-27", label: "Qui", newClients: 1, visits: 0 });
    expect(series[4]).toMatchObject({ day: "2026-08-25", newClients: 1 });
    expect(series.reduce((s, p) => s + p.newClients, 0)).toBe(2);
  });
});
