import type { Db } from "@/db/client";
import { activities } from "@/db/schema";
import { toIso } from "@/lib/dates";
import type { ActivityType } from "@/lib/domain";
import { newId } from "@/lib/ids";

/** Registra um evento na timeline do cliente. */
export async function logActivity(db: Db, clientId: string, type: ActivityType, content: string, now: Date = new Date()) {
  const row = { id: newId(), clientId, type, content, createdAt: toIso(now) };
  await db.insert(activities).values(row);
  return row;
}
