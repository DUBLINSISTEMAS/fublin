import type { Db } from "@/db/client";
import { activities } from "@/db/schema";
import { toIso } from "@/lib/dates";
import type { ActivityType } from "@/lib/domain";
import { newId } from "@/lib/ids";

export type ActivityActor = { id: string; name: string };

/** Registra um evento na timeline do cliente, incluindo quem fez a alteração. */
export async function logActivity(db: Db, clientId: string, type: ActivityType, content: string, now: Date = new Date(), actor?: ActivityActor) {
  const row = { id: newId(), clientId, type, content, authorUserId: actor?.id ?? null, authorName: actor?.name ?? null, createdAt: toIso(now) };
  await db.insert(activities).values(row);
  return row;
}
