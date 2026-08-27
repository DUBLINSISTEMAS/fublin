"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { errorMessage } from "@/lib/actions";
import { formError, formSuccess, type FormState } from "@/lib/result";
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
 * Ações rápidas (sem formulário com estado) não podem lançar: um registro apagado
 * em outro aparelho viraria a página de erro. Registramos e apenas revalidamos.
 */
export async function setClientStatusAction(formData: FormData): Promise<void> {
  const parsed = parseForm(clientStatusSchema, formData);
  if (!parsed.ok) return;
  try {
    const db = await getDb();
    await setClientStatus(db, parsed.data.id, parsed.data.status, new Date(), { lostReason: parsed.data.lostReason ?? null });
  } catch (error) {
    errorMessage(error);
  }
  revalidateClient(parsed.data.id);
}

/** Usada pelo kanban (arrastar e soltar): devolve ok/erro em vez de só revalidar. */
export async function moveClientAction(id: string, status: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = clientStatusSchema.safeParse({ id, status });
  if (!parsed.success) return { ok: false, error: "Status inválido." };
  try {
    const db = await getDb();
    await setClientStatus(db, parsed.data.id, parsed.data.status);
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
  revalidateClient(parsed.data.id);
  return { ok: true };
}

export async function assignLeaderAction(formData: FormData): Promise<void> {
  const parsed = parseForm(assignLeaderSchema, formData);
  if (!parsed.ok) return;
  try {
    const db = await getDb();
    await assignLeader(db, parsed.data.id, parsed.data.leaderId ?? null);
  } catch (error) {
    errorMessage(error);
  }
  revalidateClient(parsed.data.id);
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
  return { status: "success" };
}

export async function deleteClientAction(formData: FormData): Promise<void> {
  const parsed = parseForm(idSchema, formData);
  if (!parsed.ok) return;
  try {
    const db = await getDb();
    await deleteClient(db, parsed.data.id, getStorage());
  } catch (error) {
    errorMessage(error);
  }
  revalidateClient();
  redirect("/clientes");
}
