"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/db/client";
import { errorMessage } from "@/lib/actions";
import { actionError, OK, type ActionResult } from "@/lib/result";
import { parseForm } from "@/lib/validation";
import { backupIdSchema } from "./schema";
import { createBackup, resolveBackupDir, resolveDataDir, restoreBackup } from "./service";

/** Backup manual: mesma pasta e mesmo formato do automático. */
export async function createBackupAction(): Promise<ActionResult> {
  try {
    const db = await getDb();
    await createBackup({ db, dataDir: resolveDataDir(), backupDir: resolveBackupDir(), kind: "manual" });
  } catch (error) {
    return actionError(errorMessage(error));
  }
  revalidatePath("/", "layout");
  return OK;
}

/** Troca banco e anexos pelos do backup; antes, guarda o estado atual num backup de segurança. */
export async function restoreBackupAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = parseForm(backupIdSchema, formData);
  if (!parsed.ok) return actionError("Backup inválido.");
  try {
    const db = await getDb();
    await restoreBackup({ db, dataDir: resolveDataDir(), backupDir: resolveBackupDir(), id: parsed.data.id });
  } catch (error) {
    return actionError(errorMessage(error));
  }
  revalidatePath("/", "layout");
  return OK;
}
