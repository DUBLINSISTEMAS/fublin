"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/db/client";
import { errorMessage } from "@/lib/actions";
import { getStorage } from "@/lib/storage";
import { idSchema, parseForm } from "@/lib/validation";
import { deleteAttachment } from "./service";

/** Remove o anexo (arquivo + registro). O upload é feito pela rota /api/anexos. */
export async function deleteAttachmentAction(formData: FormData): Promise<void> {
  const parsed = parseForm(idSchema, formData);
  if (!parsed.ok) return;
  let clientId: string | undefined;
  try {
    const db = await getDb();
    clientId = (await deleteAttachment(db, getStorage(), parsed.data.id)).clientId;
  } catch (error) {
    errorMessage(error);
  }
  if (clientId) revalidatePath(`/clientes/${clientId}`);
  revalidatePath("/aprovados");
}
