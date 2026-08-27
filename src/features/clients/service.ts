import { eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { attachments, clients, leaders, type Client } from "@/db/schema";
import { dayBounds, toIso } from "@/lib/dates";
import { CLIENT_STATUS_LABELS, STATUS_RANK, type ClientStatus } from "@/lib/domain";
import { newId } from "@/lib/ids";
import { formatBRL } from "@/lib/money";
import { DomainError } from "@/lib/result";
import type { Storage } from "@/lib/storage";
import { logActivity } from "@/features/activities/service";
import type { ApprovalInput, ClientInput } from "./schema";

/** Seta usada nos registros de mudança de status. */
export const STATUS_ARROW = "→";

function toRow(input: ClientInput) {
  return {
    name: input.name,
    phone: input.phone,
    email: input.email ?? null,
    interest: input.interest,
    interestNotes: input.interestNotes ?? null,
    creditCents: input.credit,
    attendance: input.attendance,
    status: input.status,
    source: input.source ?? null,
    leaderId: input.leaderId ?? null,
    firstVisitAt: input.firstVisitDay ? toIso(dayBounds(input.firstVisitDay).start) : null,
    notes: input.notes ?? null,
  };
}

/**
 * Carimbos de data que cada etapa do funil deixa no cliente.
 * - Avançar preenche a data da etapa (só se ainda vazia: passar de aprovado para
 *   fechou mantém o "aprovado em" original).
 * - Recuar para antes de uma etapa apaga o carimbo dela: "aprovado em" só existe
 *   enquanto o cliente está aprovado ou além. Perdido guarda data e motivo.
 */
function statusStamps(before: Client, status: ClientStatus, now: Date, lostReason?: string | null): Partial<Client> {
  const iso = toIso(now);
  const rank = STATUS_RANK[status];
  const patch: Partial<Client> = {};
  if (status === "perdido") {
    // Re-salvar só o motivo não muda a data em que o cliente foi perdido.
    patch.lostAt = before.status === "perdido" ? (before.lostAt ?? iso) : iso;
    patch.lostReason = lostReason ?? before.lostReason ?? null;
    return patch;
  }
  if (before.status === "perdido") {
    patch.lostAt = null;
    patch.lostReason = null;
  }
  patch.analysisStartedAt = rank >= STATUS_RANK.analise ? (before.analysisStartedAt ?? iso) : null;
  patch.approvedAt = rank >= STATUS_RANK.aprovado ? (before.approvedAt ?? iso) : null;
  patch.closedAt = rank >= STATUS_RANK.fechou ? (before.closedAt ?? iso) : null;
  return patch;
}

export async function createClient(db: Db, input: ClientInput, now: Date = new Date()): Promise<Client> {
  const iso = toIso(now);
  const base = { id: newId(), ...toRow(input), createdAt: iso, updatedAt: iso };
  const row = {
    ...base,
    adesaoCents: null,
    analysisStartedAt: null,
    approvedAt: null,
    closedAt: null,
    lostAt: null,
    lostReason: null,
  } satisfies Omit<Client, never>;
  const stamped = { ...row, ...statusStamps(row, input.status, now) };
  await db.insert(clients).values(stamped);
  await logActivity(db, stamped.id, "cliente", "Cliente cadastrado", now);
  if (input.leaderId) await logLeader(db, stamped.id, input.leaderId, now);
  return stamped;
}

export async function getClient(db: Db, id: string): Promise<Client> {
  const row = await db.query.clients.findFirst({ where: eq(clients.id, id) });
  if (!row) throw new DomainError("Cliente não encontrado.");
  return row;
}

export async function updateClient(db: Db, id: string, input: ClientInput, now: Date = new Date()): Promise<Client> {
  const before = await getClient(db, id);
  const [updated] = await db
    .update(clients)
    .set({ ...toRow(input), ...statusStamps(before, input.status, now), updatedAt: toIso(now) })
    .where(eq(clients.id, id))
    .returning();
  if (before.status !== updated.status) await logStatusChange(db, id, before.status, updated.status, now);
  if (before.leaderId !== updated.leaderId) await logLeader(db, id, updated.leaderId, now);
  return updated;
}

export async function setClientStatus(
  db: Db,
  id: string,
  status: ClientStatus,
  now: Date = new Date(),
  options: { lostReason?: string | null } = {},
): Promise<Client> {
  const before = await getClient(db, id);
  if (before.status === status && !options.lostReason) return before;
  const [updated] = await db
    .update(clients)
    .set({ status, ...statusStamps(before, status, now, options.lostReason), updatedAt: toIso(now) })
    .where(eq(clients.id, id))
    .returning();
  if (before.status !== status) await logStatusChange(db, id, before.status, status, now);
  if (status === "perdido" && options.lostReason) await logActivity(db, id, "status", `Motivo: ${options.lostReason}`, now);
  return updated;
}

/** Troca o líder de vendas responsável (ou tira o líder). */
export async function assignLeader(db: Db, id: string, leaderId: string | null, now: Date = new Date()): Promise<Client> {
  const before = await getClient(db, id);
  if (leaderId) {
    const leader = await db.query.leaders.findFirst({ where: eq(leaders.id, leaderId) });
    if (!leader) throw new DomainError("Líder não encontrado.");
  }
  if (before.leaderId === leaderId) return before;
  const [updated] = await db.update(clients).set({ leaderId, updatedAt: toIso(now) }).where(eq(clients.id, id)).returning();
  await logLeader(db, id, leaderId, now);
  return updated;
}

/** Valores e datas da aprovação/fechamento, editados à mão na página do cliente. */
export async function updateApproval(db: Db, input: ApprovalInput, now: Date = new Date()): Promise<Client> {
  const before = await getClient(db, input.id);
  const [updated] = await db
    .update(clients)
    .set({
      creditCents: input.credit,
      adesaoCents: input.adesao,
      approvedAt: input.approvedDay ? toIso(dayBounds(input.approvedDay).start) : before.approvedAt,
      closedAt: input.closedDay ? toIso(dayBounds(input.closedDay).start) : before.closedAt,
      updatedAt: toIso(now),
    })
    .where(eq(clients.id, input.id))
    .returning();
  if (before.adesaoCents !== updated.adesaoCents) await logActivity(db, input.id, "cliente", `Adesão: ${formatBRL(updated.adesaoCents)}`, now);
  if (before.creditCents !== updated.creditCents) await logActivity(db, input.id, "cliente", `Carta: ${formatBRL(updated.creditCents)}`, now);
  return updated;
}

export async function addClientNote(db: Db, id: string, content: string, now: Date = new Date()) {
  await getClient(db, id);
  return logActivity(db, id, "nota", content, now);
}

/**
 * Exclui o cliente. As linhas dependentes somem por cascade; os arquivos de anexo
 * são apagados do disco quando um `storage` é informado (sempre, fora dos testes).
 */
export async function deleteClient(db: Db, id: string, storage?: Storage): Promise<void> {
  const keys = storage ? (await db.select({ key: attachments.storageKey }).from(attachments).where(eq(attachments.clientId, id))).map((r) => r.key) : [];
  const deleted = await db.delete(clients).where(eq(clients.id, id)).returning({ id: clients.id });
  if (deleted.length === 0) throw new DomainError("Cliente não encontrado.");
  if (storage) await removeFilesQuietly(storage, keys);
}

/** O banco já apagou; um arquivo travado no disco não pode desfazer isso — só registra. */
export async function removeFilesQuietly(storage: Storage, keys: string[]): Promise<void> {
  await Promise.all(
    keys.map((key) =>
      storage.remove(key).catch((error: unknown) => {
        console.error(`[storage] não removeu ${key}`, error);
      }),
    ),
  );
}

/**
 * O líder atendeu o cliente (visita ou reunião online realizada): registra o
 * primeiro atendimento e avança novo/agendado para "atendido". Reuniões seguintes
 * não mexem no status — quem decide se virou negociação é o relacionador.
 */
export async function registerAttendance(db: Db, id: string, attendedAt: Date, now: Date = new Date()): Promise<Client> {
  const before = await getClient(db, id);
  const advances = before.status === "novo" || before.status === "agendado";
  const [updated] = await db
    .update(clients)
    .set({
      firstVisitAt: before.firstVisitAt ?? toIso(attendedAt),
      status: advances ? "atendido" : before.status,
      updatedAt: toIso(now),
    })
    .where(eq(clients.id, id))
    .returning();
  if (advances) await logStatusChange(db, id, before.status, "atendido", now);
  return updated;
}

/** Ao agendar, cliente "novo" passa a "agendado". */
export async function markScheduled(db: Db, id: string, now: Date = new Date()): Promise<void> {
  const before = await getClient(db, id);
  if (before.status !== "novo") return;
  await db.update(clients).set({ status: "agendado", updatedAt: toIso(now) }).where(eq(clients.id, id));
  await logStatusChange(db, id, "novo", "agendado", now);
}

async function logStatusChange(db: Db, id: string, from: ClientStatus, to: ClientStatus, now: Date) {
  const content = `Status: ${CLIENT_STATUS_LABELS[from]} ${STATUS_ARROW} ${CLIENT_STATUS_LABELS[to]}`;
  await logActivity(db, id, "status", content, now);
}

async function logLeader(db: Db, id: string, leaderId: string | null, now: Date) {
  const leader = leaderId ? await db.query.leaders.findFirst({ where: eq(leaders.id, leaderId) }) : null;
  await logActivity(db, id, "lider", leader ? `Líder de vendas: ${leader.name}` : "Sem líder de vendas", now);
}
