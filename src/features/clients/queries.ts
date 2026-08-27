import { and, asc, count, desc, eq, gte, like, or, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import { appointments, clients, type Appointment, type Client, type Leader } from "@/db/schema";
import { toIso } from "@/lib/dates";
import { CLIENT_STATUSES, INTERESTS, OPEN_CLIENT_STATUSES, type ClientStatus, type Interest } from "@/lib/domain";
import { digitsOnly } from "@/lib/phone";

export type ClientFilters = {
  q?: string;
  status?: ClientStatus | "abertos";
  interest?: Interest;
  leaderId?: string;
};

export type ClientListItem = Client & { leader: Leader | null; nextAppointment: Appointment | null };

type SearchParams = Record<string, string | string[] | undefined>;

/** Normaliza filtros vindos da URL (descarta valores inválidos). */
export function parseClientFilters(params: SearchParams): ClientFilters {
  const pick = (key: string) => {
    const v = params[key];
    return Array.isArray(v) ? v[0] : v;
  };
  const status = pick("status");
  const interest = pick("interesse");
  const validStatus = status === "abertos" || (CLIENT_STATUSES as readonly string[]).includes(status ?? "");
  return {
    q: pick("q")?.trim() || undefined,
    status: validStatus ? (status as ClientFilters["status"]) : undefined,
    interest: (INTERESTS as readonly string[]).includes(interest ?? "") ? (interest as Interest) : undefined,
    leaderId: pick("lider") || undefined,
  };
}

export async function listClients(db: Db, filters: ClientFilters = {}, now: Date = new Date()): Promise<ClientListItem[]> {
  const conditions = [];
  if (filters.q) {
    const term = `%${filters.q}%`;
    const digits = digitsOnly(filters.q);
    conditions.push(digits.length >= 3 ? or(like(clients.name, term), like(clients.phone, `%${digits}%`)) : like(clients.name, term));
  }
  if (filters.status === "abertos") conditions.push(or(...OPEN_CLIENT_STATUSES.map((s) => eq(clients.status, s))));
  else if (filters.status) conditions.push(eq(clients.status, filters.status));
  if (filters.interest) conditions.push(eq(clients.interest, filters.interest));
  if (filters.leaderId) conditions.push(eq(clients.leaderId, filters.leaderId));

  const nowIso = toIso(now);
  const rows = await db.query.clients.findMany({
    where: conditions.length ? and(...conditions) : undefined,
    orderBy: [desc(clients.updatedAt)],
    with: {
      leader: true,
      appointments: {
        where: and(eq(appointments.status, "agendado"), gte(appointments.scheduledAt, nowIso)),
        orderBy: [asc(appointments.scheduledAt)],
        limit: 1,
      },
    },
  });
  return rows.map(({ appointments: next, ...client }) => ({ ...client, nextAppointment: next[0] ?? null }));
}

export type ActivityItem = { id: string; type: string; content: string; createdAt: string };
export type ClientDetail = Client & { leader: Leader | null; appointments: Appointment[]; activities: ActivityItem[] };

export async function getClientDetail(db: Db, id: string): Promise<ClientDetail | null> {
  const row = await db.query.clients.findFirst({
    where: eq(clients.id, id),
    with: {
      leader: true,
      appointments: { orderBy: [desc(appointments.scheduledAt), sql`rowid desc`] },
      // Empates de created_at (mesma transação) são desempatados pela ordem de inserção.
      activities: { orderBy: (a, { desc: d }) => [d(a.createdAt), sql`rowid desc`] },
    },
  });
  return row ?? null;
}

export type ClientOption = Pick<Client, "id" | "name" | "phone">;

export async function listClientOptions(db: Db): Promise<ClientOption[]> {
  return db.select({ id: clients.id, name: clients.name, phone: clients.phone }).from(clients).orderBy(asc(clients.name));
}

export async function countClientsByStatus(db: Db): Promise<Record<ClientStatus, number>> {
  const rows = await db.select({ status: clients.status, total: count() }).from(clients).groupBy(clients.status);
  const base = Object.fromEntries(CLIENT_STATUSES.map((s) => [s, 0])) as Record<ClientStatus, number>;
  for (const r of rows) base[r.status] = r.total;
  return base;
}

export type MonthStats = { newClients: number; visits: number; closed: number };

/** Números do mês corrente: novos cadastros, visitas realizadas e fechamentos. */
export async function getMonthStats(db: Db, monthStartDate: Date): Promise<MonthStats> {
  const start = toIso(monthStartDate);
  const [{ newClients }] = await db.select({ newClients: count() }).from(clients).where(gte(clients.createdAt, start));
  const [{ visits }] = await db
    .select({ visits: count() })
    .from(appointments)
    .where(and(eq(appointments.kind, "visita"), eq(appointments.status, "realizado"), gte(appointments.scheduledAt, start)));
  const [{ closed }] = await db
    .select({ closed: count() })
    .from(clients)
    .where(and(eq(clients.status, "fechou"), gte(clients.updatedAt, start)));
  return { newClients, visits, closed };
}
