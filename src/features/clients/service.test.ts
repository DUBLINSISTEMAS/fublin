import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { createTestDb } from "@/db/test-db";
import { createLeader } from "@/features/leaders/service";
import { clientInputSchema } from "./schema";
import { countClientsByStatus, getClientDetail, getDailySeries, getLeaderStats, getMonthStats, listApproved, listClients, parseClientFilters } from "./queries";
import { addClientNote, assignLeader, createClient, deleteClient, registerAttendance, setClientStatus, STATUS_ARROW, updateApproval, updateClient } from "./service";

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
  it("turns empty optional strings into undefined, parses money and applies defaults", () => {
    const r = clientInputSchema.parse({ name: "Ana", phone: "(11) 98765-4321", interest: "moto", email: "", leaderId: "", firstVisitDay: "", credit: "R$ 300.000" });
    expect(r.email).toBeUndefined();
    expect(r.leaderId).toBeUndefined();
    expect(r.status).toBe("novo");
    expect(r.attendance).toBe("presencial");
    expect(r.credit).toBe(30000000);
    expect(clientInputSchema.parse({ ...base, credit: "" }).credit).toBeNull();
  });
});

describe("client lifecycle", () => {
  it("creates with timeline entry (and leader log) and reads detail", async () => {
    const leader = await createLeader(db, { name: "Carlos", phone: undefined }, now);
    const created = await createClient(db, { ...base, leaderId: leader.id, firstVisitDay: "2026-08-20", attendance: "online" }, now);
    const detail = await getClientDetail(db, created.id);
    expect(detail?.leader?.name).toBe("Carlos");
    expect(detail?.attendance).toBe("online");
    expect(detail?.firstVisitAt).toBeTruthy();
    expect(detail?.activities.map((a) => a.type)).toEqual(["lider", "cliente"]);
    expect(detail?.attachments).toEqual([]);
    expect(detail?.meetingsCount).toBe(0);
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

  it("stamps analysis/approval/closing dates once and clears loss data when leaving perdido", async () => {
    const c = await createClient(db, base, now);
    const t1 = new Date(2026, 7, 27, 15, 0);
    const t2 = new Date(2026, 7, 28, 10, 0);
    const t3 = new Date(2026, 7, 29, 10, 0);
    const analysed = await setClientStatus(db, c.id, "analise", t1);
    expect(analysed.analysisStartedAt).toBe(t1.toISOString());
    const approved = await setClientStatus(db, c.id, "aprovado", t2);
    expect(approved.approvedAt).toBe(t2.toISOString());
    const closed = await setClientStatus(db, c.id, "fechou", t3);
    expect(closed.approvedAt).toBe(t2.toISOString()); // não sobrescreve
    expect(closed.closedAt).toBe(t3.toISOString());

    const lost = await setClientStatus(db, c.id, "perdido", t3, { lostReason: "Desistiu" });
    expect(lost.lostAt).toBe(t3.toISOString());
    expect(lost.lostReason).toBe("Desistiu");
    expect(lost.closedAt).toBe(t3.toISOString()); // perder não apaga o histórico de datas
    // Re-salvar só o motivo mantém a data da perda.
    const reasonOnly = await setClientStatus(db, c.id, "perdido", new Date(2026, 8, 5), { lostReason: "Fechou com concorrente" });
    expect(reasonOnly.lostAt).toBe(t3.toISOString());
    expect(reasonOnly.lostReason).toBe("Fechou com concorrente");
    const back = await setClientStatus(db, c.id, "negociando", t3);
    expect(back.lostAt).toBeNull();
    expect(back.lostReason).toBeNull();
    // Recuou para antes da análise: os carimbos de análise/aprovação/fechamento somem.
    expect(back.analysisStartedAt).toBeNull();
    expect(back.approvedAt).toBeNull();
    expect(back.closedAt).toBeNull();
    // Voltar a aprovar carimba a data nova.
    const t4 = new Date(2026, 7, 30, 10, 0);
    const reapproved = await setClientStatus(db, c.id, "aprovado", t4);
    expect(reapproved.analysisStartedAt).toBe(t4.toISOString());
    expect(reapproved.approvedAt).toBe(t4.toISOString());
    expect(reapproved.closedAt).toBeNull();

    // Fechar direto (sem passar por aprovado) carimba as duas datas.
    const other = await createClient(db, base, now);
    const direct = await setClientStatus(db, other.id, "fechou", t2);
    expect(direct.approvedAt).toBe(t2.toISOString());
    expect(direct.closedAt).toBe(t2.toISOString());
  });

  it("registerAttendance advances only novo/agendado and keeps first attendance date", async () => {
    const c = await createClient(db, base, now);
    const visit = new Date(2026, 7, 27, 10, 0);
    const after = await registerAttendance(db, c.id, visit, now);
    expect(after.status).toBe("atendido");
    expect(after.firstVisitAt).toBe(visit.toISOString());
    await setClientStatus(db, c.id, "negociando", now);
    const again = await registerAttendance(db, c.id, new Date(2026, 7, 28, 10, 0), now);
    expect(again.status).toBe("negociando");
    expect(again.firstVisitAt).toBe(visit.toISOString());
  });

  it("assigns and removes the sales leader with timeline entries", async () => {
    const leader = await createLeader(db, { name: "Bia", phone: undefined }, now);
    const c = await createClient(db, base, now);
    const assigned = await assignLeader(db, c.id, leader.id, now);
    expect(assigned.leaderId).toBe(leader.id);
    await assignLeader(db, c.id, leader.id, now); // no-op
    const removed = await assignLeader(db, c.id, null, now);
    expect(removed.leaderId).toBeNull();
    await expect(assignLeader(db, c.id, "nope", now)).rejects.toThrow("Líder não encontrado");
    const logs = (await getClientDetail(db, c.id))?.activities.filter((a) => a.type === "lider").map((a) => a.content);
    expect(logs).toEqual(["Sem líder de vendas", "Líder de vendas: Bia"]);
  });

  it("updates approval values and dates", async () => {
    const c = await createClient(db, base, now);
    const updated = await updateApproval(db, { id: c.id, credit: 30000000, adesao: 250000, approvedDay: "2026-08-20", closedDay: undefined }, now);
    expect(updated.creditCents).toBe(30000000);
    expect(updated.adesaoCents).toBe(250000);
    expect(updated.approvedAt).toBeTruthy();
    expect(updated.closedAt).toBeNull();
    const logs = (await getClientDetail(db, c.id))?.activities.map((a) => a.content) ?? [];
    expect(logs.some((l) => l.startsWith("Adesão:"))).toBe(true);
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
    await createClient(db, { ...base, name: "Bruno Lima", phone: "21999990000", interest: "automovel", leaderId: leader.id, status: "perdido" }, now);

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

  it("counts by status and month stats (approved, closed, adesão)", async () => {
    await createClient(db, base, now);
    const closed = await createClient(db, { ...base, status: "fechou" }, now);
    await updateApproval(db, { id: closed.id, credit: null, adesao: 150000, approvedDay: undefined, closedDay: undefined }, now);
    const counts = await countClientsByStatus(db);
    expect(counts.novo).toBe(1);
    expect(counts.fechou).toBe(1);
    const stats = await getMonthStats(db, new Date(2026, 7, 1));
    expect(stats).toEqual({ newClients: 2, visits: 0, approved: 1, closed: 1, adesaoCents: 150000 });
    const previous = await getMonthStats(db, new Date(2026, 6, 1), new Date(2026, 7, 1));
    expect(previous.newClients).toBe(0);
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

describe("approved list and leader stats", () => {
  it("lists approved/closed clients filtered by period and leader", async () => {
    const carlos = await createLeader(db, { name: "Carlos", phone: undefined }, now);
    const bia = await createLeader(db, { name: "Bia", phone: undefined }, now);
    const a = await createClient(db, { ...base, name: "Aprovada", leaderId: carlos.id }, now);
    const b = await createClient(db, { ...base, name: "Fechado", leaderId: bia.id }, now);
    await createClient(db, { ...base, name: "Em análise", leaderId: carlos.id, status: "analise" }, now);
    // Atendida e depois perdida: continua contando como atendida para o líder.
    await createClient(db, { ...base, name: "Perdida", leaderId: carlos.id, status: "perdido", firstVisitDay: "2026-08-10" }, now);
    await setClientStatus(db, a.id, "aprovado", new Date(2026, 7, 10));
    await setClientStatus(db, b.id, "fechou", new Date(2026, 6, 15));
    await updateApproval(db, { id: b.id, credit: 10000000, adesao: 90000, approvedDay: undefined, closedDay: undefined }, now);

    const all = await listApproved(db);
    expect(all.map((c) => c.name)).toEqual(["Aprovada", "Fechado"]);
    expect(all[1].adesaoCents).toBe(90000);
    expect(all[0].attachmentsCount).toBe(0);
    const august = await listApproved(db, { periodStart: new Date(2026, 7, 1), periodEnd: new Date(2026, 8, 1) });
    expect(august.map((c) => c.name)).toEqual(["Aprovada"]);
    expect((await listApproved(db, { leaderId: bia.id })).map((c) => c.name)).toEqual(["Fechado"]);

    const stats = await getLeaderStats(db);
    const carlosStats = stats.find((s) => s.leader.id === carlos.id)!;
    expect(carlosStats).toMatchObject({ total: 3, attended: 3, approved: 1, closed: 0, adesaoCents: 0, conversion: 0 });
    const biaStats = stats.find((s) => s.leader.id === bia.id)!;
    expect(biaStats).toMatchObject({ total: 1, attended: 1, approved: 1, closed: 1, adesaoCents: 90000, conversion: 100 });
  });
});
