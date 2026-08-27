import { eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { clients, type Client } from "@/db/schema";
import { dayBounds, toIso } from "@/lib/dates";
import { CLIENT_STATUS_LABELS, type ClientStatus } from "@/lib/domain";
import { newId } from "@/lib/ids";
import { DomainError } from "@/lib/result";
import { logActivity } from "@/features/activities/service";
import type { ClientInput } from "./schema";

/** Seta usada nos registros de mudança de status. */
export const STATUS_ARROW = "→";

function toRow(input: ClientInput) {
  return {
    name: input.name,
    phone: input.phone,
    email: input.email ?? null,
    interest: input.interest,
    interestNotes: input.interestNotes ?? null,
    status: input.status,
    source: input.source ?? null,
    leaderId: input.leaderId ?? null,
    firstVisitAt: input.firstVisitDay ? toIso(dayBounds(input.firstVisitDay).start) : null,
    notes: input.notes ?? null,
  };
}

export async function createClient(db: Db, input: ClientInput, now: Date = new Date()): Promise<Client> {
  const iso = toIso(now);
  const row: Client = { id: newId(), ...toRow(input), createdAt: iso, updatedAt: iso };
  await db.insert(clients).values(row);
  await logActivity(db, row.id, "cliente", "Cliente cadastrado", now);
  return row;
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
    .set({ ...toRow(input), updatedAt: toIso(now) })
    .where(eq(clients.id, id))
    .returning();
  if (before.status !== updated.status) await logStatusChange(db, id, before.status, updated.status, now);
  return updated;
}

export async function setClientStatus(db: Db, id: string, status: ClientStatus, now: Date = new Date()): Promise<Client> {
  const before = await getClient(db, id);
  if (before.status === status) return before;
  const [updated] = await db
    .update(clients)
    .set({ status, updatedAt: toIso(now) })
    .where(eq(clients.id, id))
    .returning();
  await logStatusChange(db, id, before.status, status, now);
  return updated;
}

export async function addClientNote(db: Db, id: string, content: string, now: Date = new Date()) {
  await getClient(db, id);
  return logActivity(db, id, "nota", content, now);
}

export async function deleteClient(db: Db, id: string): Promise<void> {
  const deleted = await db.delete(clients).where(eq(clients.id, id)).returning({ id: clients.id });
  if (deleted.length === 0) throw new DomainError("Cliente não encontrado.");
}

/** Marca a primeira visita e avança o funil quando uma visita é concluída. */
export async function registerVisit(db: Db, id: string, visitedAt: Date, now: Date = new Date()): Promise<Client> {
  const before = await getClient(db, id);
  const advances = before.status === "novo" || before.status === "agendado";
  const [updated] = await db
    .update(clients)
    .set({
      firstVisitAt: before.firstVisitAt ?? toIso(visitedAt),
      status: advances ? "visitou" : before.status,
      updatedAt: toIso(now),
    })
    .where(eq(clients.id, id))
    .returning();
  if (advances) await logStatusChange(db, id, before.status, "visitou", now);
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
