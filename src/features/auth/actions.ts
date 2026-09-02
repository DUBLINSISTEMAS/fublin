"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db/client";
import { errorMessage } from "@/lib/actions";
import { actionError, formError, type ActionResult, type FormState } from "@/lib/result";
import { idSchema, parseForm } from "@/lib/validation";
import { loginSchema, setupSchema, userInputSchema } from "./schema";
import { authenticate, createFirstAdmin, createSession, createUser, deleteSession, hasUsers, setUserActive } from "./service";
import { requireAdmin, SESSION_COOKIE } from "./session";

async function saveCookie(token: string, expiresAt: Date) {
  (await cookies()).set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: Boolean(process.env.VERCEL) || process.env.SESSION_COOKIE_SECURE === "true", path: "/", expires: expiresAt, priority: "high" });
}

export async function loginAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseForm(loginSchema, formData);
  if (!parsed.ok) return formError("Confira usuário e senha.", parsed.fieldErrors, parsed.values);
  const db = await getDb();
  const user = await authenticate(db, parsed.data);
  if (!user) return formError("Usuário ou senha incorretos.", undefined, { login: parsed.data.login });
  const session = await createSession(db, user.id);
  await saveCookie(session.token, session.expiresAt);
  redirect(user.role === "admin" ? "/" : "/clientes");
}

export async function setupAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseForm(setupSchema, formData);
  if (!parsed.ok) return formError("Confira os campos destacados.", parsed.fieldErrors, parsed.values);
  try {
    const expectedSecret = process.env.SETUP_SECRET;
    if (process.env.VERCEL && !expectedSecret) return formError("Instalação bloqueada: configure SETUP_SECRET na Vercel.");
    if (expectedSecret && formData.get("setupSecret") !== expectedSecret) return formError("Chave de instalação incorreta.", { setupSecret: ["Confira a chave de instalação"] }, parsed.values);
    const db = await getDb();
    if (await hasUsers(db)) return formError("O primeiro acesso já foi configurado.");
    const user = await createFirstAdmin(db, parsed.data);
    const session = await createSession(db, user.id);
    await saveCookie(session.token, session.expiresAt);
  } catch (error) {
    return formError(errorMessage(error), undefined, parsed.values);
  }
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await deleteSession(await getDb(), token);
  jar.delete(SESSION_COOKIE);
  redirect("/entrar");
}

export async function createUserAction(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = parseForm(userInputSchema, formData);
  if (!parsed.ok) return formError("Confira os campos destacados.", parsed.fieldErrors, parsed.values);
  try { await createUser(await getDb(), parsed.data); }
  catch (error) { return formError(errorMessage(error), undefined, parsed.values); }
  revalidatePath("/acessos");
  return { status: "success", message: "Acesso criado." };
}

export async function toggleUserAction(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = idSchema.safeParse({ id: formData.get("id") });
  const active = formData.get("active") === "true";
  if (!parsed.success) return actionError("Usuário inválido.");
  try { await setUserActive(await getDb(), parsed.data.id, active, admin.id); }
  catch (error) { return actionError(errorMessage(error)); }
  revalidatePath("/acessos");
  return { ok: true };
}
