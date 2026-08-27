import { asc, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { leaders, type Leader } from "@/db/schema";
import { toIso } from "@/lib/dates";
import { newId } from "@/lib/ids";
import { DomainError } from "@/lib/result";
import type { LeaderInput } from "./schema";

export async function listLeaders(db: Db, options: { includeInactive?: boolean } = {}): Promise<Leader[]> {
  return db.query.leaders.findMany({
    where: options.includeInactive ? undefined : eq(leaders.active, true),
    orderBy: [asc(leaders.name)],
  });
}

export async function createLeader(db: Db, input: LeaderInput, now: Date = new Date()): Promise<Leader> {
  const row: Leader = { id: newId(), name: input.name, phone: input.phone ?? null, active: true, createdAt: toIso(now) };
  await db.insert(leaders).values(row);
  return row;
}

export async function updateLeader(db: Db, id: string, input: LeaderInput): Promise<Leader> {
  const [updated] = await db
    .update(leaders)
    .set({ name: input.name, phone: input.phone ?? null })
    .where(eq(leaders.id, id))
    .returning();
  if (!updated) throw new DomainError("Líder não encontrado.");
  return updated;
}

export async function setLeaderActive(db: Db, id: string, active: boolean): Promise<Leader> {
  const [updated] = await db.update(leaders).set({ active }).where(eq(leaders.id, id)).returning();
  if (!updated) throw new DomainError("Líder não encontrado.");
  return updated;
}
