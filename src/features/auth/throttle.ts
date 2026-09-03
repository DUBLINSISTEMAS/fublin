import { inArray, lt, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import { loginAttempts } from "@/db/schema";

/** Janela deslizante: as tentativas contam durante este tempo e depois zeram. */
export const ATTEMPT_WINDOW_MINUTES = 15;

/**
 * Tetos por janela. O endereço é mais folgado porque uma casa ou um escritório
 * inteiro sai pelo mesmo IP; o login é mais apertado porque é o alvo do ataque.
 */
export const LOGIN_ATTEMPT_LIMITS = { ip: 20, login: 10 } as const;

const IP_PREFIX = "ip:";
const LOGIN_PREFIX = "login:";

/** Mensagem única para o usuário — não diz qual limite estourou nem quantas faltam. */
export const THROTTLED_MESSAGE = "Muitas tentativas. Aguarde alguns minutos.";

/** Chaves contadas em cada tentativa: o endereço de onde veio e o usuário tentado. */
export function loginAttemptKeys(ip: string, login: string): string[] {
  return [`${IP_PREFIX}${ip}`, `${LOGIN_PREFIX}${login.trim().toLowerCase()}`];
}

function limitFor(key: string): number {
  return key.startsWith(IP_PREFIX) ? LOGIN_ATTEMPT_LIMITS.ip : LOGIN_ATTEMPT_LIMITS.login;
}

function windowStart(now: Date): string {
  return new Date(now.getTime() - ATTEMPT_WINDOW_MINUTES * 60_000).toISOString();
}

/** Limpeza oportunista: as linhas de janelas vencidas somem na próxima tentativa. */
async function pruneStale(db: Db, now: Date): Promise<void> {
  await db.delete(loginAttempts).where(lt(loginAttempts.windowStartedAt, windowStart(now)));
}

/**
 * Soma 1 em cada chave, dentro do próprio banco (`ON CONFLICT ... DO UPDATE`):
 * duas funções serverless tentando ao mesmo tempo não leem 1 e gravam 2 as duas.
 * Se a janela guardada já venceu, a contagem recomeça em 1 com a janela de agora.
 */
export async function registerLoginAttempt(db: Db, keys: string[], now = new Date()): Promise<void> {
  if (!keys.length) return;
  await pruneStale(db, now);
  const iso = now.toISOString();
  const cutoff = windowStart(now);
  const expired = sql`${loginAttempts.windowStartedAt} < ${cutoff}`;
  await db
    .insert(loginAttempts)
    .values(keys.map((key) => ({ key, count: 1, windowStartedAt: iso })))
    .onConflictDoUpdate({
      target: loginAttempts.key,
      set: {
        count: sql`CASE WHEN ${expired} THEN 1 ELSE ${loginAttempts.count} + 1 END`,
        windowStartedAt: sql`CASE WHEN ${expired} THEN ${iso} ELSE ${loginAttempts.windowStartedAt} END`,
      },
    });
}

/** `true` quando qualquer uma das chaves já estourou o teto na janela atual. */
export async function isThrottled(db: Db, keys: string[], now = new Date()): Promise<boolean> {
  if (!keys.length) return false;
  const rows = await db
    .select({ key: loginAttempts.key, count: loginAttempts.count, windowStartedAt: loginAttempts.windowStartedAt })
    .from(loginAttempts)
    .where(inArray(loginAttempts.key, keys));
  const cutoff = windowStart(now);
  return rows.some((row) => row.windowStartedAt >= cutoff && row.count >= limitFor(row.key));
}

/** Entrou: as tentativas anteriores não podem atrapalhar o próximo acesso legítimo. */
export async function clearLoginAttempts(db: Db, keys: string[]): Promise<void> {
  if (!keys.length) return;
  await db.delete(loginAttempts).where(inArray(loginAttempts.key, keys));
}
