"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/db/client";
import { requireAdmin } from "@/features/auth/session";
import { errorMessage } from "@/lib/actions";
import { actionError, OK, type ActionResult } from "@/lib/result";
import { parseForm } from "@/lib/validation";
import { backupIdSchema } from "./schema";
import { createBackup, resolveBackupDir, resolveDataDir, restoreBackup } from "./service";
import { localBackupsAvailable } from "@/lib/runtime";

const cloudBackupError = () => actionError("Backup local não está disponível na versão online.");

/** Backup manual: mesma pasta e mesmo formato do automático. */
export async function createBackupAction(): Promise<ActionResult> {
  await requireAdmin();
  if (!localBackupsAvailable()) return cloudBackupError();
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
  await requireAdmin();
  if (!localBackupsAvailable()) return cloudBackupError();
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
