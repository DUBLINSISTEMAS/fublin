"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { assertClientAccess, requireAdmin, requireUser } from "@/features/auth/session";
import { errorMessage } from "@/lib/actions";
import { actionError, formError, formSuccess, OK, type ActionResult, type FormState } from "@/lib/result";
import { getStorage } from "@/lib/storage";
import { idSchema, parseForm } from "@/lib/validation";
import { createClientWithSchedule, updateClientWithSchedule, type OnboardingResult } from "./onboarding";
import { approvalSchema, assignLeaderSchema, clientContactSchema, clientInputSchema, clientNoteSchema, clientStatusSchema } from "./schema";
import { addClientContact, addClientNote, assignLeader, deleteClient, findDuplicatePhone, setClientStatus, updateApproval } from "./service";

const INVALID = "Confira os campos destacados.";

function revalidateClient(id?: string) {
  revalidatePath("/");
  revalidatePath("/clientes");
  revalidatePath("/agenda");
  revalidatePath("/aprovados");
  revalidatePath("/lideres");
  if (id) revalidatePath(`/clientes/${id}`);
}

/** Página do cliente; se o agendamento falhou depois de salvar, ela avisa e pede para marcar de novo. */
function clientDestination(result: OnboardingResult): string {
  return result.scheduleError ? `/clientes/${result.client.id}?aviso=agendamento` : `/clientes/${result.client.id}`;
}

export async function createClientAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = parseForm(clientInputSchema, formData);
  if (!parsed.ok) return formError(INVALID, parsed.fieldErrors, parsed.values);
  let result: OnboardingResult;
  try {
    const db = await getDb();
    const duplicate = await findDuplicatePhone(db, parsed.data.phone);
    if (duplicate) return formError(`Este telefone já pertence a ${duplicate.name}. Abra o cadastro existente.`, { phone: ["Telefone já cadastrado"] }, parsed.values);
    result = await createClientWithSchedule(db, parsed.data);
  } catch (error) {
    return formError(errorMessage(error), undefined, parsed.values);
  }
  revalidateClient(result.client.id);
  redirect(clientDestination(result));
}

export async function updateClientAction(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = parseForm(clientInputSchema, formData);
  if (!parsed.ok) return formError(INVALID, parsed.fieldErrors, parsed.values);
  let result: OnboardingResult;
  try {
    const db = await getDb();
    const duplicate = await findDuplicatePhone(db, parsed.data.phone, id);
    if (duplicate) return formError(`Este telefone já pertence a ${duplicate.name}.`, { phone: ["Telefone já cadastrado"] }, parsed.values);
    result = await updateClientWithSchedule(db, id, parsed.data);
  } catch (error) {
    return formError(errorMessage(error), undefined, parsed.values);
  }
  revalidateClient(id);
  redirect(clientDestination(result));
}

/**
 * Ações rápidas (sem formulário com campos) devolvem `ActionResult`: um registro
 * apagado em outro aparelho vira uma mensagem na tela, não a página de erro.
 */
export async function setClientStatusAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = parseForm(clientStatusSchema, formData);
  if (!parsed.ok) return actionError("Status inválido.");
  try {
    const db = await getDb();
    await assertClientAccess(db, user, parsed.data.id);
    await setClientStatus(db, parsed.data.id, parsed.data.status, new Date(), { lostReason: parsed.data.lostReason ?? null }, user);
  } catch (error) {
    return actionError(errorMessage(error));
  }
  revalidateClient(parsed.data.id);
  return OK;
}

/** Usada pelo kanban (arrastar e soltar) e pelo menu do card. */
export async function moveClientAction(id: string, status: string): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = clientStatusSchema.safeParse({ id, status });
  if (!parsed.success) return actionError("Status inválido.");
  try {
    const db = await getDb();
    await assertClientAccess(db, user, parsed.data.id);
    await setClientStatus(db, parsed.data.id, parsed.data.status, new Date(), {}, user);
  } catch (error) {
    return actionError(errorMessage(error));
  }
  revalidateClient(parsed.data.id);
  return OK;
}

export async function assignLeaderAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = parseForm(assignLeaderSchema, formData);
  if (!parsed.ok) return actionError("Líder inválido.");
  try {
    const db = await getDb();
    await assignLeader(db, parsed.data.id, parsed.data.leaderId ?? null);
  } catch (error) {
    return actionError(errorMessage(error));
  }
  revalidateClient(parsed.data.id);
  return OK;
}

export async function updateApprovalAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = parseForm(approvalSchema, formData);
  if (!parsed.ok) return formError(INVALID, parsed.fieldErrors, parsed.values);
  try {
    const db = await getDb();
    await updateApproval(db, parsed.data);
  } catch (error) {
    return formError(errorMessage(error), undefined, parsed.values);
  }
  revalidateClient(parsed.data.id);
  return formSuccess("Salvo.");
}

export async function addClientNoteAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = parseForm(clientNoteSchema, formData);
  if (!parsed.ok) return formError("Escreva a nota antes de salvar.", parsed.fieldErrors, parsed.values);
  try {
    const db = await getDb();
    await assertClientAccess(db, user, parsed.data.id);
    await addClientNote(db, parsed.data.id, parsed.data.content, new Date(), user);
  } catch (error) {
    return formError(errorMessage(error), undefined, parsed.values);
  }
  revalidateClient(parsed.data.id);
  return formSuccess("Comentário publicado.");
}

export async function addClientContactAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = parseForm(clientContactSchema, formData);
  if (!parsed.ok) return formError("Confira o registro do contato.", parsed.fieldErrors, parsed.values);
  try {
    const db = await getDb();
    await assertClientAccess(db, user, parsed.data.id);
    await addClientContact(db, parsed.data.id, parsed.data.kind, parsed.data.summary, new Date(), user);
  } catch (error) {
    return formError(errorMessage(error), undefined, parsed.values);
  }
  revalidateClient(parsed.data.id);
  return formSuccess("Contato registrado.");
}

export async function deleteClientAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = parseForm(idSchema, formData);
  if (!parsed.ok) return actionError("Cliente inválido.");
  try {
    const db = await getDb();
    await deleteClient(db, parsed.data.id, getStorage());
  } catch (error) {
    return actionError(errorMessage(error));
  }
  revalidateClient();
  redirect("/clientes");
}
