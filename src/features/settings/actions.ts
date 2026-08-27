"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { getDb } from "@/db/client";
import { errorMessage } from "@/lib/actions";
import { formError, formSuccess, type FormState } from "@/lib/result";
import { parseForm } from "@/lib/validation";
import { alertSettingsSchema, goalSettingsFormSchema, periodSettingsSchema, profileFormSchema, type AppSettings, type SettingsKey } from "./schema";
import { patchSetting, saveSetting } from "./service";

const INVALID = "Confira os campos destacados.";

/** Perfil e quinzenas aparecem em todas as telas (sidebar, metas): revalida o layout inteiro. */
function revalidateAll() {
  revalidatePath("/", "layout");
}

async function saveFromForm<K extends SettingsKey, S extends z.ZodTypeAny>(
  key: K,
  schema: S,
  formData: FormData,
  apply: (data: z.output<S>) => Promise<void>,
  success: string,
): Promise<FormState> {
  const parsed = parseForm(schema, formData);
  if (!parsed.ok) return formError(INVALID, parsed.fieldErrors, parsed.values);
  try {
    await apply(parsed.data);
  } catch (error) {
    return formError(errorMessage(error), undefined, parsed.values);
  }
  revalidateAll();
  return formSuccess(success);
}

export async function saveProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  return saveFromForm("profile", profileFormSchema, formData, async (data) => {
    const db = await getDb();
    await patchSetting(db, "profile", { name: data.name });
  }, "Perfil salvo.");
}

export async function savePeriodAction(_prev: FormState, formData: FormData): Promise<FormState> {
  return saveFromForm("period", periodSettingsSchema, formData, async (data) => {
    const db = await getDb();
    await saveSetting(db, "period", data);
  }, "Quinzenas atualizadas.");
}

export async function saveAlertsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  return saveFromForm("alerts", alertSettingsSchema, formData, async (data) => {
    const db = await getDb();
    await saveSetting(db, "alerts", data as AppSettings["alerts"]);
  }, "Alertas atualizados.");
}

export async function saveGoalDefaultsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  return saveFromForm("goals", goalSettingsFormSchema, formData, async (data) => {
    const db = await getDb();
    await saveSetting(db, "goals", data);
  }, "Meta padrão salva.");
}
