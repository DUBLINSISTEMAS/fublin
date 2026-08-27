"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { errorMessage } from "@/lib/actions";
import { actionError, formError, formSuccess, OK, type ActionResult, type FormState } from "@/lib/result";
import { getStorage } from "@/lib/storage";
import { idSchema, parseForm } from "@/lib/validation";
import { approvalSchema, assignLeaderSchema, clientInputSchema, clientNoteSchema, clientStatusSchema } from "./schema";
import { addClientNote, assignLeader, createClient, deleteClient, setClientStatus, updateApproval, updateClient } from "./service";

const INVALID = "Confira os campos destacados.";

function revalidateClient(id?: string) {
  revalidatePath("/");
  revalidatePath("/clientes");
  revalidatePath("/agenda");
  revalidatePath("/aprovados");
  revalidatePath("/lideres");
  if (id) revalidatePath(`/clientes/${id}`);
}

export async function createClientAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseForm(clientInputSchema, formData);
  if (!parsed.ok) return formError(INVALID, parsed.fieldErrors, parsed.values);
  let id: string;
  try {
    const db = await getDb();
    id = (await createClient(db, parsed.data)).id;
  } catch (error) {
    return formError(errorMessage(error), undefined, parsed.values);
  }
  revalidateClient(id);
  redirect(`/clientes/${id}`);
}

export async function updateClientAction(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseForm(clientInputSchema, formData);
  if (!parsed.ok) return formError(INVALID, parsed.fieldErrors, parsed.values);
  try {
    const db = await getDb();
    await updateClient(db, id, parsed.data);
  } catch (error) {
    return formError(errorMessage(error), undefined, parsed.values);
  }
  revalidateClient(id);
  redirect(`/clientes/${id}`);
}

/**
 * Ações rápidas (sem formulário com campos) devolvem `ActionResult`: um registro
 * apagado em outro aparelho vira uma mensagem na tela, não a página de erro.
 */
export async function setClientStatusAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = parseForm(clientStatusSchema, formData);
  if (!parsed.ok) return actionError("Status inválido.");
  try {
    const db = await getDb();
    await setClientStatus(db, parsed.data.id, parsed.data.status, new Date(), { lostReason: parsed.data.lostReason ?? null });
  } catch (error) {
    return actionError(errorMessage(error));
  }
  revalidateClient(parsed.data.id);
  return OK;
}

/** Usada pelo kanban (arrastar e soltar) e pelo menu do card. */
export async function moveClientAction(id: string, status: string): Promise<ActionResult> {
  const parsed = clientStatusSchema.safeParse({ id, status });
  if (!parsed.success) return actionError("Status inválido.");
  try {
    const db = await getDb();
    await setClientStatus(db, parsed.data.id, parsed.data.status);
  } catch (error) {
    return actionError(errorMessage(error));
  }
  revalidateClient(parsed.data.id);
  return OK;
}

export async function assignLeaderAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
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
  const parsed = parseForm(clientNoteSchema, formData);
  if (!parsed.ok) return formError("Escreva a nota antes de salvar.", parsed.fieldErrors, parsed.values);
  try {
    const db = await getDb();
    await addClientNote(db, parsed.data.id, parsed.data.content);
  } catch (error) {
    return formError(errorMessage(error), undefined, parsed.values);
  }
  revalidateClient(parsed.data.id);
  return formSuccess();
}

export async function deleteClientAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
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
