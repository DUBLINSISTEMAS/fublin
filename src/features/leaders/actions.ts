"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db/client";
import { requireAdmin } from "@/features/auth/session";
import { errorMessage } from "@/lib/actions";
import { actionError, formError, formSuccess, OK, type ActionResult, type FormState } from "@/lib/result";
import { idSchema, parseForm } from "@/lib/validation";
import { leaderInputSchema } from "./schema";
import { createLeader, setLeaderActive, updateLeader } from "./service";

function revalidateLeaders() {
  revalidatePath("/lideres");
  revalidatePath("/clientes");
}

export async function createLeaderAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = parseForm(leaderInputSchema, formData);
  if (!parsed.ok) return formError("Informe o nome do líder.", parsed.fieldErrors, parsed.values);
  try {
    const db = await getDb();
    await createLeader(db, parsed.data);
  } catch (error) {
    return formError(errorMessage(error), undefined, parsed.values);
  }
  revalidateLeaders();
  return formSuccess("Líder adicionado.");
}

export async function updateLeaderAction(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = parseForm(leaderInputSchema, formData);
  if (!parsed.ok) return formError("Informe o nome do líder.", parsed.fieldErrors, parsed.values);
  try {
    const db = await getDb();
    await updateLeader(db, id, parsed.data);
  } catch (error) {
    return formError(errorMessage(error), undefined, parsed.values);
  }
  revalidateLeaders();
  return formSuccess("Líder atualizado.");
}

const toggleSchema = idSchema.extend({ active: z.enum(["true", "false"]) });

export async function toggleLeaderAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = parseForm(toggleSchema, formData);
  if (!parsed.ok) return actionError("Líder inválido.");
  try {
    const db = await getDb();
    await setLeaderActive(db, parsed.data.id, parsed.data.active === "true");
  } catch (error) {
    return actionError(errorMessage(error));
  }
  revalidateLeaders();
  return OK;
}
