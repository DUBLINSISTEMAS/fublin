"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { requireAdmin } from "@/features/auth/session";
import { errorMessage } from "@/lib/actions";
import { dayKey, fromIso } from "@/lib/dates";
import { actionError, formError, OK, type ActionResult, type FormState } from "@/lib/result";
import { idSchema, parseForm } from "@/lib/validation";
import { z } from "zod";
import { appointmentInputSchema, appointmentStatusSchema } from "./schema";
import { createAppointment, deleteAppointment, getAppointment, rescheduleAppointment, setAppointmentStatus, updateAppointment } from "./service";

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
  await requireAdmin();
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
  await requireAdmin();
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

const rescheduleSchema = z.object({ id: z.string().min(1), startIso: z.iso.datetime() });

/** Arrastar na agenda: novo horário em ISO; devolve ok/erro para a UI desfazer se precisar. */
export async function rescheduleAppointmentAction(id: string, startIso: string): Promise<ActionResult> {
  await requireAdmin();
  const parsed = rescheduleSchema.safeParse({ id, startIso });
  if (!parsed.success) return actionError("Horário inválido.");
  let clientId: string;
  try {
    const db = await getDb();
    clientId = (await rescheduleAppointment(db, parsed.data.id, new Date(parsed.data.startIso))).clientId;
  } catch (error) {
    return actionError(errorMessage(error));
  }
  revalidateAppointment(clientId);
  return OK;
}

/** Baixa rápida (Realizado / Faltou): o erro volta para o botão, sem página de erro. */
export async function setAppointmentStatusAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = parseForm(appointmentStatusSchema, formData);
  if (!parsed.ok) return actionError("Status inválido.");
  let clientId: string;
  try {
    const db = await getDb();
    clientId = (await setAppointmentStatus(db, parsed.data.id, parsed.data.status)).clientId;
  } catch (error) {
    return actionError(errorMessage(error));
  }
  revalidateAppointment(clientId);
  return OK;
}

export async function deleteAppointmentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = parseForm(idSchema, formData);
  if (!parsed.ok) return actionError("Agendamento inválido.");
  let clientId: string;
  try {
    const db = await getDb();
    clientId = (await getAppointment(db, parsed.data.id)).clientId;
    await deleteAppointment(db, parsed.data.id);
  } catch (error) {
    return actionError(errorMessage(error));
  }
  revalidateAppointment(clientId);
  redirect(`/clientes/${clientId}`);
}
