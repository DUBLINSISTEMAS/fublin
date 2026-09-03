import type { Db } from "@/db/client";
import { activities } from "@/db/schema";
import { toIso } from "@/lib/dates";
import type { ActivityType } from "@/lib/domain";
import { newId } from "@/lib/ids";

export type ActivityActor = { id: string; name: string };

/** O handle que `db.transaction(async (tx) => …)` entrega (Drizzle + libsql). */
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/**
 * Conexão ou transação. Todo serviço que escreve mais de uma linha aceita os dois:
 * a função exportada abre a transação e as internas recebem o `tx`, para que o
 * registro e a linha da timeline entrem juntos ou não entrem.
 */
export type DbOrTx = Db | Tx;

/** Registra um evento na timeline do cliente, incluindo quem fez a alteração. */
export async function logActivity(db: DbOrTx, clientId: string, type: ActivityType, content: string, now: Date = new Date(), actor?: ActivityActor) {
  const row = { id: newId(), clientId, type, content, authorUserId: actor?.id ?? null, authorName: actor?.name ?? null, createdAt: toIso(now) };
  await db.insert(activities).values(row);
  return row;
}
