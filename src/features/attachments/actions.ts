"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/db/client";
import { requireAdmin } from "@/features/auth/session";
import { errorMessage } from "@/lib/actions";
import { actionError, OK, type ActionResult } from "@/lib/result";
import { getStorage } from "@/lib/storage";
import { idSchema, parseForm } from "@/lib/validation";
import { deleteAttachment } from "./service";

/** Remove o anexo (arquivo + registro). O upload é feito pela rota /api/anexos. */
export async function deleteAttachmentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = parseForm(idSchema, formData);
  if (!parsed.ok) return actionError("Anexo inválido.");
  let clientId: string;
  try {
    const db = await getDb();
    clientId = (await deleteAttachment(db, getStorage(), parsed.data.id)).clientId;
  } catch (error) {
    return actionError(errorMessage(error));
  }
  revalidatePath(`/clientes/${clientId}`);
  revalidatePath("/aprovados");
  return OK;
}
