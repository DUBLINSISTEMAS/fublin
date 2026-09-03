"use server";

import { timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db/client";
import { errorMessage } from "@/lib/actions";
import type { UserRole } from "@/lib/domain";
import { actionError, formError, type ActionResult, type FormState } from "@/lib/result";
import { idSchema, parseForm } from "@/lib/validation";
import { loginSchema, passwordChangeSchema, resetPasswordSchema, setupSchema, userInputSchema } from "./schema";
import { authenticate, changePassword, createFirstAdmin, createSession, createUser, deleteSession, hasUsers, resetUserPassword, setUserActive, unlockUser } from "./service";
import { clearLoginAttempts, isThrottled, loginAttemptKeys, registerLoginAttempt, THROTTLED_MESSAGE } from "./throttle";
import { requireAdmin, requireUser, SESSION_COOKIE } from "./session";

/**
 * Em produção o cookie só viaja por HTTPS. Na rede local (`next start` pelo instalador)
 * o acesso é HTTP, então `SESSION_COOKIE_SECURE=false` libera; na Vercel fica sempre ligado.
 */
function secureCookie(): boolean {
  if (process.env.VERCEL) return true;
  if (process.env.SESSION_COOKIE_SECURE) return process.env.SESSION_COOKIE_SECURE === "true";
  return process.env.NODE_ENV === "production" && !process.env.LOCAL_NETWORK_HTTP;
}

async function saveCookie(token: string, expiresAt: Date) {
  (await cookies()).set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: secureCookie(), path: "/", expires: expiresAt, priority: "high" });
}

/** Compara a chave de instalação sem vazar, pelo tempo, quantos caracteres batem. */
function setupSecretMatches(expected: string, given: FormDataEntryValue | null): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(String(given ?? ""));
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Fora do computador do dono (Vercel ou qualquer build de produção público), criar o 1º admin exige a chave. */
function setupSecretRequired(): boolean {
  return Boolean(process.env.VERCEL) || (process.env.NODE_ENV === "production" && !process.env.LOCAL_NETWORK_HTTP);
}

/**
 * Endereço de quem está tentando entrar. Atrás de um proxy (Vercel) o IP real é a
 * primeira entrada de `x-forwarded-for`; sem proxy nenhum (rede local) não há
 * cabeçalho e todo mundo cai na mesma chave "local", que ainda limita a máquina.
 */
async function requestIp(): Promise<string> {
  const forwarded = (await headers()).get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "local";
}

export async function loginAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseForm(loginSchema, formData);
  if (!parsed.ok) return formError("Confira usuário e senha.", parsed.fieldErrors, parsed.values);
  let role: UserRole;
  try {
    const db = await getDb();
    const keys = loginAttemptKeys(await requestIp(), parsed.data.login);
    if (await isThrottled(db, keys)) return formError(THROTTLED_MESSAGE, undefined, { login: parsed.data.login });
    await registerLoginAttempt(db, keys);
    const user = await authenticate(db, parsed.data);
    if (!user) return formError("Usuário ou senha incorretos.", undefined, { login: parsed.data.login });
    await clearLoginAttempts(db, keys);
    const session = await createSession(db, user.id);
    await saveCookie(session.token, session.expiresAt);
    role = user.role;
  } catch (error) {
    return formError(errorMessage(error), undefined, { login: parsed.data.login });
  }
  redirect(role === "admin" ? "/" : "/clientes");
}

export async function setupAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseForm(setupSchema, formData);
  if (!parsed.ok) return formError("Confira os campos destacados.", parsed.fieldErrors, parsed.values);
  try {
    const db = await getDb();
    // Adivinhar a chave de instalação é um ataque de senha como outro qualquer.
    const keys = loginAttemptKeys(await requestIp(), parsed.data.login);
    if (await isThrottled(db, keys)) return formError(THROTTLED_MESSAGE, undefined, parsed.values);
    await registerLoginAttempt(db, keys);
    const expectedSecret = process.env.SETUP_SECRET;
    if (setupSecretRequired() && !expectedSecret) return formError("Instalação bloqueada: configure SETUP_SECRET no servidor.");
    if (expectedSecret && !setupSecretMatches(expectedSecret, formData.get("setupSecret"))) return formError("Chave de instalação incorreta.", { setupSecret: ["Confira a chave de instalação"] }, parsed.values);
    if (await hasUsers(db)) return formError("O primeiro acesso já foi configurado.");
    await clearLoginAttempts(db, keys);
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
  // O cookie some primeiro: sair tem que funcionar mesmo se o banco falhar nesse instante.
  jar.delete(SESSION_COOKIE);
  if (token) {
    try {
      await deleteSession(await getDb(), token);
    } catch (error) {
      console.error("[auth] não apagou a sessão ao sair", error);
    }
  }
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

/** Troca da própria senha, na tela de configurações. A sessão de quem trocou continua de pé. */
export async function changePasswordAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = parseForm(passwordChangeSchema, formData);
  // Senhas nunca voltam para a tela: o formulário se limpa sozinho depois do erro.
  if (!parsed.ok) return formError("Confira os campos destacados.", parsed.fieldErrors);
  try { await changePassword(await getDb(), user.id, parsed.data, (await cookies()).get(SESSION_COOKIE)?.value ?? null); }
  catch (error) { return formError(errorMessage(error)); }
  return { status: "success", message: "Senha alterada. Os outros aparelhos precisam entrar de novo." };
}

/** Redefinição feita pelo administrador para outra pessoa (esqueceu a senha). */
export async function resetPasswordAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = parseForm(resetPasswordSchema, formData);
  if (!parsed.ok) return formError("Confira os campos destacados.", parsed.fieldErrors);
  try { await resetUserPassword(await getDb(), parsed.data, admin.id); }
  catch (error) { return formError(errorMessage(error)); }
  revalidatePath("/acessos");
  return { status: "success", message: "Senha redefinida." };
}

/** Libera quem travou por errar a senha, sem esperar o fim do bloqueio. */
export async function unlockUserAction(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = idSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return actionError("Usuário inválido.");
  try { await unlockUser(await getDb(), parsed.data.id); }
  catch (error) { return actionError(errorMessage(error)); }
  revalidatePath("/acessos");
  return { ok: true };
}
