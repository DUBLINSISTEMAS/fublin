import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { and, count, eq, gt, gte, lt, ne, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import { sessions, users, type User } from "@/db/schema";
import { newId } from "@/lib/ids";
import { DomainError } from "@/lib/result";
import type { LoginInput, PasswordChangeInput, ResetPasswordInput, SetupInput, UserInput } from "./schema";

const scrypt = promisify(scryptCallback);
const SESSION_DAYS = 30;
const MAX_LOGIN_FAILURES = 5;
const LOGIN_LOCK_MINUTES = 15;

export type SafeUser = Omit<User, "passwordHash" | "failedLoginCount" | "lockedUntil">;

/**
 * Usuário pronto para sair do servidor. Os campos são listados um a um de
 * propósito: uma coluna nova em `users` entra em `SafeUser` (que é `Omit` de
 * três campos) e some deste objeto — o TypeScript acusa o campo faltando e
 * obriga a decidir se ela pode ou não aparecer na UI.
 */
export function safeUser(value: User): SafeUser {
  const { id, name, login, role, leaderId, active, createdAt, updatedAt } = value;
  return { id, name, login, role, leaderId, active, createdAt, updatedAt };
}

/** Usuário na tela de acessos: o administrador precisa enxergar o bloqueio para poder liberar. */
export type ManagedUser = SafeUser & { lockedUntil: string | null };

/** `true` enquanto o bloqueio por senha errada ainda vale. */
export function isLocked(lockedUntil: string | null, now = new Date()): boolean {
  return Boolean(lockedUntil && lockedUntil > now.toISOString());
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, salt, expectedHex] = stored.split("$");
  if (algorithm !== "scrypt" || !salt || !expectedHex) return false;
  const expected = Buffer.from(expectedHex, "hex");
  const actual = (await scrypt(password, salt, expected.length)) as Buffer;
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");

/** Hash "de mentira" para gastar o mesmo tempo quando o login não existe (não dá para descobrir usuários pelo relógio). */
const DUMMY_HASH = `scrypt$${"0".repeat(32)}$${"0".repeat(128)}`;

export async function hasUsers(db: Db): Promise<boolean> {
  const [row] = await db.select({ total: count() }).from(users);
  return row.total > 0;
}

export async function createFirstAdmin(db: Db, input: SetupInput, now = new Date()): Promise<SafeUser> {
  if (await hasUsers(db)) throw new DomainError("O administrador inicial já foi criado.");
  return createUser(db, { ...input, role: "admin", leaderId: undefined }, now);
}

export async function createUser(db: Db, input: UserInput, now = new Date()): Promise<SafeUser> {
  const login = input.login.trim().toLowerCase();
  if (await db.query.users.findFirst({ where: eq(users.login, login) })) throw new DomainError("Este usuário já existe.");
  const iso = now.toISOString();
  const [created] = await db.insert(users).values({
    id: newId(), name: input.name.trim(), login, passwordHash: await hashPassword(input.password),
    role: input.role, leaderId: input.role === "leader" ? input.leaderId ?? null : null,
    active: true, createdAt: iso, updatedAt: iso,
  }).returning();
  return safeUser(created);
}

export async function authenticate(db: Db, input: LoginInput, now = new Date()): Promise<SafeUser | null> {
  const user = await db.query.users.findFirst({ where: eq(users.login, input.login.trim().toLowerCase()) });
  if (!user || !user.active) {
    await verifyPassword(input.password, DUMMY_HASH);
    return null;
  }
  if (user.lockedUntil && user.lockedUntil > now.toISOString()) return null;
  if (!(await verifyPassword(input.password, user.passwordHash))) {
    // Incremento no próprio banco: tentativas simultâneas não "leem 0 e gravam 1" todas juntas.
    const [after] = await db
      .update(users)
      .set({ failedLoginCount: sql`${users.failedLoginCount} + 1`, updatedAt: now.toISOString() })
      .where(eq(users.id, user.id))
      .returning({ failures: users.failedLoginCount });
    if (after && after.failures >= MAX_LOGIN_FAILURES) {
      const lockedUntil = new Date(now.getTime() + LOGIN_LOCK_MINUTES * 60_000).toISOString();
      await db.update(users).set({ failedLoginCount: 0, lockedUntil }).where(and(eq(users.id, user.id), gte(users.failedLoginCount, MAX_LOGIN_FAILURES)));
    }
    return null;
  }
  if (user.failedLoginCount || user.lockedUntil) {
    await db.update(users).set({ failedLoginCount: 0, lockedUntil: null, updatedAt: now.toISOString() }).where(eq(users.id, user.id));
  }
  return safeUser(user);
}

export async function createSession(db: Db, userId: string, now = new Date()): Promise<{ token: string; expiresAt: Date }> {
  await db.delete(sessions).where(lt(sessions.expiresAt, now.toISOString()));
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + SESSION_DAYS);
  await db.insert(sessions).values({ id: newId(), userId, tokenHash: tokenHash(token), expiresAt: expiresAt.toISOString(), createdAt: now.toISOString() });
  return { token, expiresAt };
}

export async function userFromSession(db: Db, token: string, now = new Date()): Promise<SafeUser | null> {
  const session = await db.query.sessions.findFirst({
    where: and(eq(sessions.tokenHash, tokenHash(token)), gt(sessions.expiresAt, now.toISOString())),
    with: { user: true },
  });
  return session?.user.active ? safeUser(session.user) : null;
}

export async function deleteSession(db: Db, token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash(token)));
}

export async function listUsers(db: Db): Promise<ManagedUser[]> {
  const rows = await db.query.users.findMany({ orderBy: (u, { asc }) => [asc(u.name)] });
  return rows.map((row) => ({ ...safeUser(row), lockedUntil: row.lockedUntil }));
}

/**
 * Troca da própria senha. Exige a senha atual e derruba as outras sessões:
 * se alguém entrou com a senha antiga, sai na hora. A sessão de quem trocou
 * (`keepToken`) continua valendo para a pessoa não ser deslogada do próprio app.
 */
export async function changePassword(db: Db, userId: string, input: PasswordChangeInput, keepToken: string | null, now = new Date()): Promise<void> {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) throw new DomainError("Usuário não encontrado.");
  if (!(await verifyPassword(input.currentPassword, user.passwordHash))) throw new DomainError("A senha atual está incorreta.");
  await db.update(users).set({ passwordHash: await hashPassword(input.password), failedLoginCount: 0, lockedUntil: null, updatedAt: now.toISOString() }).where(eq(users.id, userId));
  const mine = and(eq(sessions.userId, userId), keepToken ? ne(sessions.tokenHash, tokenHash(keepToken)) : undefined);
  await db.delete(sessions).where(mine);
}

/**
 * Redefinição feita pelo administrador para outra pessoa: derruba todas as
 * sessões dela e libera o bloqueio. Para a própria senha existe `changePassword`,
 * que pede a senha atual — o administrador não escapa dessa conferência.
 */
export async function resetUserPassword(db: Db, input: ResetPasswordInput, currentUserId: string, now = new Date()): Promise<void> {
  if (input.id === currentUserId) throw new DomainError("Para trocar a sua própria senha, use “Sua conta” nas configurações.");
  const changed = await db
    .update(users)
    .set({ passwordHash: await hashPassword(input.password), failedLoginCount: 0, lockedUntil: null, updatedAt: now.toISOString() })
    .where(eq(users.id, input.id))
    .returning({ id: users.id });
  if (!changed.length) throw new DomainError("Usuário não encontrado.");
  await db.delete(sessions).where(eq(sessions.userId, input.id));
}

/** Libera quem ficou bloqueado por errar a senha, sem esperar os 15 minutos. */
export async function unlockUser(db: Db, id: string, now = new Date()): Promise<void> {
  const changed = await db
    .update(users)
    .set({ failedLoginCount: 0, lockedUntil: null, updatedAt: now.toISOString() })
    .where(eq(users.id, id))
    .returning({ id: users.id });
  if (!changed.length) throw new DomainError("Usuário não encontrado.");
}

export async function setUserActive(db: Db, id: string, active: boolean, currentUserId: string, now = new Date()): Promise<void> {
  if (id === currentUserId && !active) throw new DomainError("Você não pode desativar o próprio acesso.");
  const changed = await db.update(users).set({ active, updatedAt: now.toISOString() }).where(eq(users.id, id)).returning({ id: users.id });
  if (!changed.length) throw new DomainError("Usuário não encontrado.");
  if (!active) await db.delete(sessions).where(eq(sessions.userId, id));
}
