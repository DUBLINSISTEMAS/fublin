import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { and, count, eq, gt, lt } from "drizzle-orm";
import type { Db } from "@/db/client";
import { sessions, users, type User } from "@/db/schema";
import { newId } from "@/lib/ids";
import { DomainError } from "@/lib/result";
import type { LoginInput, SetupInput, UserInput } from "./schema";

const scrypt = promisify(scryptCallback);
const SESSION_DAYS = 30;
const MAX_LOGIN_FAILURES = 5;
const LOGIN_LOCK_MINUTES = 15;

export type SafeUser = Omit<User, "passwordHash" | "failedLoginCount" | "lockedUntil">;
export function safeUser(value: User): SafeUser {
  const user: Partial<User> = { ...value };
  delete user.passwordHash;
  delete user.failedLoginCount;
  delete user.lockedUntil;
  return user as SafeUser;
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, salt, expectedHex] = stored.split("$");
  if (algorithm !== "scrypt" || !salt || !expectedHex) return false;
  const expected = Buffer.from(expectedHex, "hex");
  const actual = (await scrypt(password, salt, expected.length)) as Buffer;
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");

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
  if (!user || !user.active) return null;
  if (user.lockedUntil && user.lockedUntil > now.toISOString()) return null;
  if (!(await verifyPassword(input.password, user.passwordHash))) {
    const failures = user.failedLoginCount + 1;
    const lockedUntil = failures >= MAX_LOGIN_FAILURES
      ? new Date(now.getTime() + LOGIN_LOCK_MINUTES * 60_000).toISOString()
      : null;
    await db.update(users).set({ failedLoginCount: lockedUntil ? 0 : failures, lockedUntil, updatedAt: now.toISOString() }).where(eq(users.id, user.id));
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

export async function listUsers(db: Db): Promise<SafeUser[]> {
  return (await db.query.users.findMany({ orderBy: (u, { asc }) => [asc(u.name)] })).map(safeUser);
}

export async function setUserActive(db: Db, id: string, active: boolean, currentUserId: string, now = new Date()): Promise<void> {
  if (id === currentUserId && !active) throw new DomainError("Você não pode desativar o próprio acesso.");
  const changed = await db.update(users).set({ active, updatedAt: now.toISOString() }).where(eq(users.id, id)).returning({ id: users.id });
  if (!changed.length) throw new DomainError("Usuário não encontrado.");
  if (!active) await db.delete(sessions).where(eq(sessions.userId, id));
}
