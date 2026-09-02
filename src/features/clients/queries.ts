import { and, asc, count, desc, eq, gte, inArray, like, lt, or, sql } from "drizzle-orm";
import type { AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import type { Db } from "@/db/client";
import { appointments, attachments, clients, leaders, type Appointment, type Attachment, type Client, type Leader } from "@/db/schema";
import { dayBounds, dayKey, formatWeekdayShort, fromIso, shiftDayKey, toIso, weekStartKey, type DayKey } from "@/lib/dates";
import { ATTENDANCE_KINDS, CLIENT_STATUSES, INTERESTS, OPEN_CLIENT_STATUSES, STATUS_RANK, type ActivityType, type ClientStatus, type Interest } from "@/lib/domain";
import type { Source } from "@/lib/domain";
import { countMeetings, countMeetingsDone, meetingNumber } from "@/features/appointments/sequence";
import { digitsOnly } from "@/lib/phone";
import { pickParam, type SearchParams } from "@/lib/search-params";

export type ClientFilters = {
  q?: string;
  status?: ClientStatus | "abertos";
  interest?: Interest;
  leaderId?: string;
  priority?: boolean;
  schedule?: "today" | "week";
};

export type NextAppointment = Pick<Appointment, "id" | "scheduledAt" | "kind" | "status"> & {
  /** Qual encontro este é (1ª, 2ª, 3ª visita/reunião) — `null` para ligação e retorno. */
  meetingNumber: number | null;
};

export type ClientListItem = Client & {
  leader: Leader | null;
  nextAppointment: NextAppointment | null;
  /** Visitas/reuniões já realizadas com o líder. */
  meetingsCount: number;
  /** Visitas/reuniões marcadas ao todo (as feitas, as faltadas e as que ainda vêm). */
  meetingsTotal: number;
  /** Início da etapa atual, reconstruído pela trilha de mudanças de status. */
  statusSince: string;
};

/** Normaliza filtros vindos da URL (descarta valores inválidos). */
export function parseClientFilters(params: SearchParams): ClientFilters {
  const status = pickParam(params, "status");
  const interest = pickParam(params, "interesse");
  const validStatus = status === "abertos" || (CLIENT_STATUSES as readonly string[]).includes(status ?? "");
  return {
    q: pickParam(params, "q")?.trim() || undefined,
    status: validStatus ? (status as ClientFilters["status"]) : undefined,
    interest: (INTERESTS as readonly string[]).includes(interest ?? "") ? (interest as Interest) : undefined,
    leaderId: pickParam(params, "lider") || undefined,
    ...(pickParam(params, "prioridade") === "1" ? { priority: true } : {}),
    ...(["today", "week"].includes(pickParam(params, "agenda") ?? "") ? { schedule: pickParam(params, "agenda") as ClientFilters["schedule"] } : {}),
  };
}

/** `%` e `_` são curingas do LIKE; quem busca "50%" quer o texto literal. */
function likeContains(text: string): string {
  return `%${text.replace(/[\\%_]/g, "\\$&")}%`;
}
const LIKE_ESCAPE = "\\";

/** Só o necessário para "próximo agendamento" e "atendimentos realizados". */
const LIGHT_APPOINTMENT_COLUMNS = { id: true, scheduledAt: true, kind: true, status: true } as const;

/** Cliente por id, ou `null` (páginas usam para responder 404 sem carregar o detalhe inteiro). */
export async function findClient(db: Db, id: string): Promise<Client | null> {
  return (await db.query.clients.findFirst({ where: eq(clients.id, id) })) ?? null;
}

export async function listClients(db: Db, filters: ClientFilters = {}, now: Date = new Date()): Promise<ClientListItem[]> {
  const conditions = [];
  if (filters.q) {
    const byName = sql`${clients.name} LIKE ${likeContains(filters.q)} ESCAPE ${LIKE_ESCAPE}`;
    const byEmail = sql`${clients.email} LIKE ${likeContains(filters.q)} ESCAPE ${LIKE_ESCAPE}`;
    const byInterest = sql`${clients.interestNotes} LIKE ${likeContains(filters.q)} ESCAPE ${LIKE_ESCAPE}`;
    const byNotes = sql`${clients.notes} LIKE ${likeContains(filters.q)} ESCAPE ${LIKE_ESCAPE}`;
    const bySource = sql`${clients.source} LIKE ${likeContains(filters.q)} ESCAPE ${LIKE_ESCAPE}`;
    const digits = digitsOnly(filters.q);
    conditions.push(digits.length >= 3 ? or(byName, byEmail, byInterest, byNotes, bySource, like(clients.phone, `%${digits}%`)) : or(byName, byEmail, byInterest, byNotes, bySource));
  }
  if (filters.status === "abertos") conditions.push(or(...OPEN_CLIENT_STATUSES.map((s) => eq(clients.status, s))));
  else if (filters.status) conditions.push(eq(clients.status, filters.status));
  if (filters.interest) conditions.push(eq(clients.interest, filters.interest));
  if (filters.leaderId) conditions.push(eq(clients.leaderId, filters.leaderId));

  const nowIso = toIso(now);
  const today = dayKey(now);
  const scheduleRange = filters.schedule
    ? filters.schedule === "today"
      ? { start: dayBounds(today).start, end: dayBounds(shiftDayKey(today, 1)).start }
      : { start: dayBounds(weekStartKey(today)).start, end: dayBounds(shiftDayKey(weekStartKey(today), 7)).start }
    : null;
  const rows = await db.query.clients.findMany({
    where: conditions.length ? and(...conditions) : undefined,
    orderBy: [desc(clients.updatedAt)],
    with: {
      leader: true,
      appointments: { columns: LIGHT_APPOINTMENT_COLUMNS, orderBy: [asc(appointments.scheduledAt)] },
      activities: { columns: { type: true, createdAt: true }, orderBy: (a, { desc: d }) => [d(a.createdAt)] },
    },
  });
  const mapped = rows.map(({ appointments: all, activities: history, ...client }) => {
    const scheduled = all.filter((a) => a.status === "agendado");
    const next = scheduleRange
      ? scheduled.find((a) => a.scheduledAt >= toIso(scheduleRange.start) && a.scheduledAt < toIso(scheduleRange.end)) ?? null
      : scheduled.find((a) => a.scheduledAt >= nowIso) ?? null;
    const statusSince = history.find((a) => a.type === "status")?.createdAt ?? client.createdAt;
    return {
      ...client,
      nextAppointment: next ? { ...next, meetingNumber: meetingNumber(all, next.id) } : null,
      meetingsCount: countMeetingsDone(all),
      meetingsTotal: countMeetings(all),
      statusSince,
    };
  });
  const scheduled = scheduleRange ? mapped.filter((client) => client.nextAppointment) : mapped;
  return filters.priority ? scheduled.filter((client) => (OPEN_CLIENT_STATUSES as readonly string[]).includes(client.status) && !client.nextAppointment) : scheduled;
}

export type ActivityItem = { id: string; type: ActivityType; content: string; authorUserId?: string | null; authorName?: string | null; createdAt: string };
export type ClientDetail = Client & { leader: Leader | null; appointments: Appointment[]; activities: ActivityItem[]; attachments: Attachment[]; meetingsCount: number; meetingsTotal: number };

export async function getClientDetail(db: Db, id: string): Promise<ClientDetail | null> {
  const row = await db.query.clients.findFirst({
    where: eq(clients.id, id),
    with: {
      leader: true,
      appointments: { orderBy: [desc(appointments.scheduledAt), sql`rowid desc`] },
      // Empates de created_at (mesma transação) são desempatados pela ordem de inserção.
      activities: { orderBy: (a, { desc: d }) => [d(a.createdAt), sql`rowid desc`] },
      attachments: { orderBy: [desc(attachments.createdAt)] },
    },
  });
  if (!row) return null;
  return { ...row, meetingsCount: countMeetingsDone(row.appointments), meetingsTotal: countMeetings(row.appointments) };
}

export type ClientOption = Pick<Client, "id" | "name" | "phone">;

export async function listClientOptions(db: Db): Promise<ClientOption[]> {
  return db.select({ id: clients.id, name: clients.name, phone: clients.phone }).from(clients).orderBy(asc(clients.name));
}

export async function countClientsByStatus(db: Db, leaderId?: string): Promise<Record<ClientStatus, number>> {
  const rows = await db.select({ status: clients.status, total: count() }).from(clients).where(leaderId ? eq(clients.leaderId, leaderId) : undefined).groupBy(clients.status);
  const base = Object.fromEntries(CLIENT_STATUSES.map((s) => [s, 0])) as Record<ClientStatus, number>;
  for (const r of rows) base[r.status] = r.total;
  return base;
}

export type PeriodStats = { newClients: number; visits: number; approved: number; closed: number; creditCents: number; adesaoCents: number };

export type ConversionItem = { key: string; total: number; closed: number; conversion: number; creditCents: number };
export type CommercialBreakdown = { bySource: ConversionItem[]; byInterest: ConversionItem[] };

/** Conversão da carteira captada no período, por origem e interesse. */
export async function getCommercialBreakdown(db: Db, periodStart?: Date, periodEnd?: Date): Promise<CommercialBreakdown> {
  const conditions = [];
  if (periodStart) conditions.push(gte(clients.createdAt, toIso(periodStart)));
  if (periodEnd) conditions.push(lt(clients.createdAt, toIso(periodEnd)));
  const rows = await db.select({ source: clients.source, interest: clients.interest, status: clients.status, credit: clients.creditCents }).from(clients).where(conditions.length ? and(...conditions) : undefined);
  const group = (keyOf: (row: (typeof rows)[number]) => string) => {
    const map = new Map<string, ConversionItem>();
    for (const row of rows) {
      const key = keyOf(row);
      const item = map.get(key) ?? { key, total: 0, closed: 0, conversion: 0, creditCents: 0 };
      item.total += 1;
      if (row.status === "fechou") { item.closed += 1; item.creditCents += row.credit ?? 0; }
      map.set(key, item);
    }
    return [...map.values()].map((item) => ({ ...item, conversion: item.total ? Math.round((item.closed / item.total) * 100) : 0 })).sort((a, b) => b.total - a.total);
  };
  return { bySource: group((row) => (row.source as Source | null) ?? "nao_informada"), byInterest: group((row) => row.interest) };
}

/** Números de um período [start, end): novos, atendimentos realizados, aprovados, fechados, cartas e adesão somadas. */
export async function getPeriodStats(db: Db, periodStart: Date, periodEnd?: Date): Promise<PeriodStats> {
  const start = toIso(periodStart);
  const end = periodEnd ? toIso(periodEnd) : undefined;
  const within = (column: AnySQLiteColumn) => (end ? and(gte(column, start), lt(column, end)) : gte(column, start));
  const [[{ newClients }], [{ visits }], [{ approved }], closedRows] = await Promise.all([
    db.select({ newClients: count() }).from(clients).where(within(clients.createdAt)),
    db
      .select({ visits: count() })
      .from(appointments)
      .where(and(inArray(appointments.kind, [...ATTENDANCE_KINDS]), eq(appointments.status, "realizado"), within(appointments.scheduledAt))),
    db.select({ approved: count() }).from(clients).where(within(clients.approvedAt)),
    db.select({ credit: clients.creditCents, adesao: clients.adesaoCents }).from(clients).where(and(eq(clients.status, "fechou"), within(clients.closedAt))),
  ]);
  return {
    newClients,
    visits,
    approved,
    closed: closedRows.length,
    creditCents: closedRows.reduce((sum, r) => sum + (r.credit ?? 0), 0),
    adesaoCents: closedRows.reduce((sum, r) => sum + (r.adesao ?? 0), 0),
  };
}

export type ActionItem = { id: string; name: string; status: ClientStatus; leaderName: string | null; /** Dias desde o fato que pede ação. */ days: number };
export type NeedsAction = { noNextStep: ActionItem[]; stuckInAnalysis: ActionItem[]; missingAdesao: ActionItem[] };

const STUCK_AFTER_DAYS = 5;
const daysSince = (iso: string | null, now: Date) => (iso ? Math.max(0, Math.floor((now.getTime() - fromIso(iso).getTime()) / 86_400_000)) : 0);

/**
 * Quem precisa de um próximo passo hoje: abertos sem agendamento futuro (os parados há mais
 * tempo primeiro), em análise há mais de 5 dias e aprovados/fechados sem adesão registrada.
 */
export async function listClientsNeedingAction(db: Db, now: Date, limit = 5): Promise<NeedsAction> {
  const nowIso = toIso(now);
  const rows = await db.query.clients.findMany({
    where: or(inArray(clients.status, [...OPEN_CLIENT_STATUSES]), eq(clients.status, "fechou")),
    with: { leader: { columns: { name: true } }, appointments: { columns: { scheduledAt: true, status: true } } },
  });
  const item = (c: (typeof rows)[number], since: string | null): ActionItem => ({ id: c.id, name: c.name, status: c.status, leaderName: c.leader?.name ?? null, days: daysSince(since, now) });
  const open = rows.filter((c) => (OPEN_CLIENT_STATUSES as readonly string[]).includes(c.status));
  const noNextStep = open
    .filter((c) => c.status !== "aprovado" && !c.appointments.some((a) => a.status === "agendado" && a.scheduledAt >= nowIso))
    .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))
    .map((c) => item(c, c.updatedAt));
  const stuckInAnalysis = open
    .filter((c) => c.status === "analise" && daysSince(c.analysisStartedAt, now) >= STUCK_AFTER_DAYS)
    .sort((a, b) => (a.analysisStartedAt ?? "").localeCompare(b.analysisStartedAt ?? ""))
    .map((c) => item(c, c.analysisStartedAt));
  const missingAdesao = rows
    .filter((c) => (c.status === "aprovado" || c.status === "fechou") && !c.adesaoCents)
    .sort((a, b) => (a.approvedAt ?? "").localeCompare(b.approvedAt ?? ""))
    .map((c) => item(c, c.closedAt ?? c.approvedAt));
  return { noNextStep: noNextStep.slice(0, limit), stuckInAnalysis: stuckInAnalysis.slice(0, limit), missingAdesao: missingAdesao.slice(0, limit) };
}

export type DayPoint = { day: DayKey; label: string; newClients: number; visits: number };

/** Série de N dias a partir de `firstDay`: novos clientes e atendimentos realizados por dia. */
export async function getDailySeries(db: Db, firstDay: DayKey, days: number): Promise<DayPoint[]> {
  const startIso = toIso(dayBounds(firstDay).start);
  const endIso = toIso(dayBounds(shiftDayKey(firstDay, days)).start);
  const [clientRows, visitRows] = await Promise.all([
    db.select({ at: clients.createdAt }).from(clients).where(and(gte(clients.createdAt, startIso), lt(clients.createdAt, endIso))),
    db
      .select({ at: appointments.scheduledAt })
      .from(appointments)
      .where(and(inArray(appointments.kind, [...ATTENDANCE_KINDS]), eq(appointments.status, "realizado"), gte(appointments.scheduledAt, startIso), lt(appointments.scheduledAt, endIso))),
  ]);
  const countByDay = (rows: { at: string }[]) => {
    const map = new Map<string, number>();
    for (const r of rows) {
      const key = dayKey(fromIso(r.at));
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  };
  const newByDay = countByDay(clientRows);
  const visitsByDay = countByDay(visitRows);
  // Até 7 dias cabe o nome do dia; séries maiores usam o número do dia.
  const label = (day: DayKey) => (days <= 7 ? formatWeekdayShort(dayBounds(day).start) : String(Number(day.slice(8, 10))));
  return Array.from({ length: days }, (_, i) => {
    const day = shiftDayKey(firstDay, i);
    return { day, label: label(day), newClients: newByDay.get(day) ?? 0, visits: visitsByDay.get(day) ?? 0 };
  });
}

/* ---------- Aprovados ---------- */

export type ApprovedFilters = { periodStart?: Date; periodEnd?: Date; leaderId?: string };
export type ApprovedItem = Client & { leader: Leader | null; attachmentsCount: number; meetingsCount: number };

/** Clientes aprovados ou fechados, mais recentes primeiro. O período filtra pela data de aprovação. */
export async function listApproved(db: Db, filters: ApprovedFilters = {}): Promise<ApprovedItem[]> {
  const conditions = [inArray(clients.status, ["aprovado", "fechou"])];
  if (filters.periodStart) conditions.push(gte(clients.approvedAt, toIso(filters.periodStart)));
  if (filters.periodEnd) conditions.push(lt(clients.approvedAt, toIso(filters.periodEnd)));
  if (filters.leaderId) conditions.push(eq(clients.leaderId, filters.leaderId));
  const rows = await db.query.clients.findMany({
    where: and(...conditions),
    orderBy: [desc(clients.approvedAt), desc(clients.updatedAt)],
    with: { leader: true, attachments: { columns: { id: true } }, appointments: { columns: { kind: true, status: true } } },
  });
  return rows.map(({ attachments: files, appointments: all, ...client }) => ({
    ...client,
    attachmentsCount: files.length,
    meetingsCount: countMeetingsDone(all),
  }));
}

/* ---------- Líderes ---------- */

export type LeaderStats = {
  leader: Leader;
  total: number;
  attended: number;
  approved: number;
  closed: number;
  /** Soma das cartas fechadas (a "produção" do líder). */
  creditCents: number;
  adesaoCents: number;
  /** fechados / total, em % inteiro (0 quando não há clientes). */
  conversion: number;
};

export type DateRange = { start: Date; end: Date };

/**
 * Desempenho por líder de vendas: quantos clientes recebeu, atendeu, aprovou e fechou.
 * Com `range`, cada número conta pela data do próprio fato dentro de [start, end):
 * recebidos pelo cadastro, atendidos pelo 1º atendimento, aprovados/fechados pelas datas de etapa.
 */
export async function getLeaderStats(db: Db, range?: DateRange): Promise<LeaderStats[]> {
  const [leaderRows, clientRows] = await Promise.all([
    db.select().from(leaders).orderBy(asc(leaders.name)),
    db
      .select({
        leaderId: clients.leaderId,
        status: clients.status,
        credit: clients.creditCents,
        adesao: clients.adesaoCents,
        createdAt: clients.createdAt,
        firstVisitAt: clients.firstVisitAt,
        approvedAt: clients.approvedAt,
        closedAt: clients.closedAt,
      })
      .from(clients),
  ]);
  const within = (iso: string | null) => {
    if (!range) return true;
    if (!iso) return false;
    const start = toIso(range.start);
    const end = toIso(range.end);
    return iso >= start && iso < end;
  };
  return leaderRows.map((leader) => {
    const mine = clientRows.filter((c) => c.leaderId === leader.id);
    const total = mine.filter((c) => within(c.createdAt)).length;
    // Atendido é um fato histórico: quem foi atendido e depois se perdeu continua contando.
    const attended = range
      ? mine.filter((c) => within(c.firstVisitAt)).length
      : mine.filter((c) => c.firstVisitAt !== null || (c.status !== "perdido" && STATUS_RANK[c.status] >= STATUS_RANK.atendido)).length;
    const approved = mine.filter((c) => (c.status === "aprovado" || c.status === "fechou") && (!range || within(c.approvedAt))).length;
    const closedRows = mine.filter((c) => c.status === "fechou" && within(c.closedAt));
    return {
      leader,
      total,
      attended,
      approved,
      closed: closedRows.length,
      creditCents: closedRows.reduce((sum, c) => sum + (c.credit ?? 0), 0),
      adesaoCents: closedRows.reduce((sum, c) => sum + (c.adesao ?? 0), 0),
      conversion: total ? Math.round((closedRows.length / total) * 100) : 0,
    };
  });
}
