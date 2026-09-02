import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Db } from "@/db/client";
import { getDb } from "@/db/client";
import { clients } from "@/db/schema";
import { eq } from "drizzle-orm";
import { DomainError } from "@/lib/result";
import { userFromSession, type SafeUser } from "./service";
import { SESSION_COOKIE } from "./constants";

export { SESSION_COOKIE } from "./constants";

export async function currentUser(): Promise<SafeUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return userFromSession(await getDb(), token);
}

export async function requireUser(): Promise<SafeUser> {
  const user = await currentUser();
  if (!user) redirect("/entrar");
  return user;
}

export async function requireAdmin(): Promise<SafeUser> {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/clientes");
  return user;
}

export function canAccessClient(user: SafeUser, leaderId: string | null): boolean {
  return user.role === "admin" || Boolean(user.leaderId && user.leaderId === leaderId);
}

export async function assertClientAccess(db: Db, user: SafeUser, clientId: string): Promise<void> {
  const client = await db.query.clients.findFirst({ where: eq(clients.id, clientId), columns: { leaderId: true } });
  if (!client || !canAccessClient(user, client.leaderId)) throw new DomainError("Você não tem acesso a este cliente.");
}
