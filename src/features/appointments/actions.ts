"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { errorMessage } from "@/lib/actions";
import { dayKey, fromIso } from "@/lib/dates";
import { formError, type FormState } from "@/lib/result";
import { idSchema, parseForm } from "@/lib/validation";
import { appointmentInputSchema, appointmentStatusSchema } from "./schema";
import { createAppointment, deleteAppointment, getAppointment, setAppointmentStatus, updateAppointment } from "./service";

const INVALID = "Confira os campos destacados.";

function revalidateAppointment(clientId?: string) {
  revalidatePath("/");
  revalidatePath("/agenda");
  revalidatePath("/clientes");
  if (clientId) revalidatePath(`/clientes/${clientId}`);
}

/** Para onde voltar depois de salvar: a agenda do dia ou o cliente (via `returnTo`). */
function destination(formData: FormData, clientId: string, scheduledAt: string): string {
  const returnTo = String(formData.get("returnTo") ?? "");
  if (returnTo === "cliente") return `/clientes/${clientId}`;
  return `/agenda?d=${dayKey(fromIso(scheduledAt))}`;
}

export async function createAppointmentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseForm(appointmentInputSchema, formData);
  if (!parsed.ok) return formError(INVALID, parsed.fieldErrors, parsed.values);
  let target: string;
  try {
    const db = await getDb();
    const created = await createAppointment(db, parsed.data);
    target = destination(formData, created.clientId, created.scheduledAt);
  } catch (error) {
    return formError(errorMessage(error), undefined, parsed.values);
  }
  revalidateAppointment(parsed.data.clientId);
  redirect(target);
}

export async function updateAppointmentAction(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseForm(appointmentInputSchema, formData);
  if (!parsed.ok) return formError(INVALID, parsed.fieldErrors, parsed.values);
  let target: string;
  try {
    const db = await getDb();
    const updated = await updateAppointment(db, id, parsed.data);
    target = destination(formData, updated.clientId, updated.scheduledAt);
  } catch (error) {
    return formError(errorMessage(error), undefined, parsed.values);
  }
  revalidateAppointment(parsed.data.clientId);
  redirect(target);
}

/** Ações rápidas não lançam: registro sumido em outro aparelho só gera log + revalidação. */
export async function setAppointmentStatusAction(formData: FormData): Promise<void> {
  const parsed = parseForm(appointmentStatusSchema, formData);
  if (!parsed.ok) return;
  let clientId: string | undefined;
  try {
    const db = await getDb();
    clientId = (await setAppointmentStatus(db, parsed.data.id, parsed.data.status)).clientId;
  } catch (error) {
    errorMessage(error);
  }
  revalidateAppointment(clientId);
}

export async function deleteAppointmentAction(formData: FormData): Promise<void> {
  const parsed = parseForm(idSchema, formData);
  if (!parsed.ok) return;
  let clientId: string | undefined;
  try {
    const db = await getDb();
    clientId = (await getAppointment(db, parsed.data.id)).clientId;
    await deleteAppointment(db, parsed.data.id);
  } catch (error) {
    errorMessage(error);
  }
  revalidateAppointment(clientId);
  redirect(clientId ? `/clientes/${clientId}` : "/agenda");
}
