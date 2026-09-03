import { eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { attachments, clients, leaders, type Client } from "@/db/schema";
import { dayBounds, formatDate, fromIso, toIso } from "@/lib/dates";
import { CLIENT_PRIORITY_LABELS, CLIENT_STATUS_LABELS, STATUS_RANK, type ClientPriority, type ClientStatus } from "@/lib/domain";
import { newId } from "@/lib/ids";
import { formatBRL } from "@/lib/money";
import { digitsOnly } from "@/lib/phone";
import { DomainError } from "@/lib/result";
import type { Storage } from "@/lib/storage";
import { logActivity } from "@/features/activities/service";
import type { ActivityActor, DbOrTx } from "@/features/activities/service";
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
    adesaoCents: input.adesao,
    installmentMinCents: input.installmentMin,
    installmentMaxCents: input.installmentMax,
    attendance: input.attendance,
    status: input.status,
    priority: input.priority,
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

/**
 * Toda escrita de cliente vem acompanhada de pelo menos uma linha de timeline
 * (e às vezes de um segundo UPDATE). Numa base multiusuário, gravar isso solto
 * deixaria cliente sem histórico — ou histórico sem cliente — se a segunda
 * escrita falhasse; por isso cada operação abre uma transação e as funções
 * `*Tx` fazem o trabalho dentro dela.
 */
export async function createClient(db: Db, input: ClientInput, now: Date = new Date()): Promise<Client> {
  return db.transaction((tx) => createClientTx(tx, input, now));
}

async function createClientTx(db: DbOrTx, input: ClientInput, now: Date): Promise<Client> {
  const iso = toIso(now);
  const base = { id: newId(), ...toRow(input), createdAt: iso, updatedAt: iso };
  const row = {
    ...base,
    analysisStartedAt: null,
    approvedAt: null,
    closedAt: null,
    lostAt: null,
    lostReason: null,
  } satisfies Client;
  const stamped = { ...row, ...statusStamps(row, input.status, now) };
  await db.insert(clients).values(stamped);
  await logActivity(db, stamped.id, "cliente", "Cliente cadastrado", now);
  if (input.leaderId) await logLeader(db, stamped.id, input.leaderId, now);
  return stamped;
}

export async function getClient(db: DbOrTx, id: string): Promise<Client> {
  const row = await db.query.clients.findFirst({ where: eq(clients.id, id) });
  if (!row) throw new DomainError("Cliente não encontrado.");
  return row;
}

export async function updateClient(db: Db, id: string, input: ClientInput, now: Date = new Date()): Promise<Client> {
  return db.transaction((tx) => updateClientTx(tx, id, input, now));
}

async function updateClientTx(db: DbOrTx, id: string, input: ClientInput, now: Date): Promise<Client> {
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
  actor?: ActivityActor,
): Promise<Client> {
  return db.transaction((tx) => setClientStatusTx(tx, id, status, now, options, actor));
}

async function setClientStatusTx(
  db: DbOrTx,
  id: string,
  status: ClientStatus,
  now: Date,
  options: { lostReason?: string | null },
  actor?: ActivityActor,
): Promise<Client> {
  const before = await getClient(db, id);
  if (before.status === status && !options.lostReason) return before;
  const [updated] = await db
    .update(clients)
    .set({ status, ...statusStamps(before, status, now, options.lostReason), updatedAt: toIso(now) })
    .where(eq(clients.id, id))
    .returning();
  if (before.status !== status) await logStatusChange(db, id, before.status, status, now, actor);
  if (status === "perdido" && options.lostReason) await logActivity(db, id, "status", `Motivo: ${options.lostReason}`, now, actor);
  return updated;
}

/** Troca o líder de vendas responsável (ou tira o líder). */
export async function assignLeader(db: Db, id: string, leaderId: string | null, now: Date = new Date()): Promise<Client> {
  return db.transaction((tx) => assignLeaderTx(tx, id, leaderId, now));
}

/** Troca a prioridade sem alterar a etapa do funil e registra a decisão na timeline. */
export async function setClientPriority(db: Db, id: string, priority: ClientPriority, now: Date = new Date()): Promise<Client> {
  return db.transaction(async (tx) => {
    const before = await getClient(tx, id);
    if (before.priority === priority) return before;
    const [updated] = await tx.update(clients).set({ priority, updatedAt: toIso(now) }).where(eq(clients.id, id)).returning();
    await logActivity(tx, id, "cliente", `Prioridade: ${CLIENT_PRIORITY_LABELS[priority]}`, now);
    return updated;
  });
}

async function assignLeaderTx(db: DbOrTx, id: string, leaderId: string | null, now: Date): Promise<Client> {
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

/**
 * Campo de data do formulário: "" apaga a data (o dono limpou o campo), ausente
 * deixa como está (chamadas que só mexem em valores).
 */
function dayPatch(day: string | undefined, current: string | null): string | null {
  if (day === undefined) return current;
  return day === "" ? null : toIso(dayBounds(day).start);
}

/** Valores e datas da aprovação/fechamento, editados à mão na página do cliente. */
export async function updateApproval(db: Db, input: ApprovalInput, now: Date = new Date()): Promise<Client> {
  return db.transaction((tx) => updateApprovalTx(tx, input, now));
}

async function updateApprovalTx(db: DbOrTx, input: ApprovalInput, now: Date): Promise<Client> {
  const before = await getClient(db, input.id);
  const [updated] = await db
    .update(clients)
    .set({
      creditCents: input.credit,
      adesaoCents: input.adesao,
      approvedAt: dayPatch(input.approvedDay, before.approvedAt),
      closedAt: dayPatch(input.closedDay, before.closedAt),
      updatedAt: toIso(now),
    })
    .where(eq(clients.id, input.id))
    .returning();
  if (before.adesaoCents !== updated.adesaoCents) await logActivity(db, input.id, "cliente", `Adesão: ${formatBRL(updated.adesaoCents)}`, now);
  if (before.creditCents !== updated.creditCents) await logActivity(db, input.id, "cliente", `Carta: ${formatBRL(updated.creditCents)}`, now);
  // As datas mandam no período em que a venda conta na meta: mexer nelas fica no histórico.
  if (before.approvedAt !== updated.approvedAt) await logActivity(db, input.id, "cliente", `Aprovado em: ${dateOrNever(updated.approvedAt)}`, now);
  if (before.closedAt !== updated.closedAt) await logActivity(db, input.id, "cliente", `Fechou em: ${dateOrNever(updated.closedAt)}`, now);
  return updated;
}

const dateOrNever = (iso: string | null) => (iso ? formatDate(fromIso(iso)) : "sem data");

export async function addClientNote(db: DbOrTx, id: string, content: string, now: Date = new Date(), actor?: ActivityActor) {
  await getClient(db, id);
  return logActivity(db, id, "nota", content, now, actor);
}

/** Telefone identifica a pessoa no CRM; formatação diferente não cria outro cliente. */
export async function findDuplicatePhone(db: DbOrTx, phone: string, ignoreId?: string): Promise<{ id: string; name: string } | null> {
  const wanted = digitsOnly(phone);
  const rows = await db.select({ id: clients.id, name: clients.name, phone: clients.phone }).from(clients);
  const duplicate = rows.find((row) => row.id !== ignoreId && digitsOnly(row.phone) === wanted);
  return duplicate ? { id: duplicate.id, name: duplicate.name } : null;
}

export type ContactKind = "whatsapp" | "ligacao" | "email" | "outro";
const CONTACT_LABELS: Record<ContactKind, string> = { whatsapp: "WhatsApp", ligacao: "Ligação", email: "E-mail", outro: "Contato" };

/** Registra uma tentativa/conversa sem obrigar a criar um agendamento. */
export async function addClientContact(db: DbOrTx, id: string, kind: ContactKind, summary: string, now: Date = new Date(), actor?: ActivityActor) {
  await getClient(db, id);
  return logActivity(db, id, "nota", `${CONTACT_LABELS[kind]}: ${summary}`, now, actor);
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
  return db.transaction((tx) => registerAttendanceTx(tx, id, attendedAt, now));
}

/** Mesma coisa, mas dentro de uma transação já aberta (a baixa do agendamento usa esta). */
export async function registerAttendanceTx(db: DbOrTx, id: string, attendedAt: Date, now: Date): Promise<Client> {
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
  return db.transaction((tx) => markScheduledTx(tx, id, now));
}

/** Mesma coisa, mas dentro de uma transação já aberta (criar agendamento usa esta). */
export async function markScheduledTx(db: DbOrTx, id: string, now: Date): Promise<void> {
  const before = await getClient(db, id);
  if (before.status !== "novo") return;
  await db.update(clients).set({ status: "agendado", updatedAt: toIso(now) }).where(eq(clients.id, id));
  await logStatusChange(db, id, "novo", "agendado", now);
}

async function logStatusChange(db: DbOrTx, id: string, from: ClientStatus, to: ClientStatus, now: Date, actor?: ActivityActor) {
  const content = `Status: ${CLIENT_STATUS_LABELS[from]} ${STATUS_ARROW} ${CLIENT_STATUS_LABELS[to]}`;
  await logActivity(db, id, "status", content, now, actor);
}

async function logLeader(db: DbOrTx, id: string, leaderId: string | null, now: Date) {
  const leader = leaderId ? await db.query.leaders.findFirst({ where: eq(leaders.id, leaderId) }) : null;
  await logActivity(db, id, "lider", leader ? `Líder de vendas: ${leader.name}` : "Sem líder de vendas", now);
}
