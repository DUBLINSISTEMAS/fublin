"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { getDb } from "@/db/client";
import { errorMessage } from "@/lib/actions";
import { formError, formSuccess, type FormState } from "@/lib/result";
import { parseForm } from "@/lib/validation";
import { alertSettingsSchema, commissionFormSchema, goalSettingsFormSchema, periodFormSchema, profileFormSchema, type AppSettings } from "./schema";
import { patchSetting, saveSetting } from "./service";

const INVALID = "Confira os campos destacados.";

/** Perfil, quinzenas e comissão aparecem em todas as telas (sidebar, metas): revalida o layout inteiro. */
function revalidateAll() {
  revalidatePath("/", "layout");
}

async function saveFromForm<S extends z.ZodTypeAny>(schema: S, formData: FormData, apply: (data: z.output<S>) => Promise<void>, success: string): Promise<FormState> {
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
  return saveFromForm(profileFormSchema, formData, async (data) => {
    await patchSetting(await getDb(), "profile", { name: data.name });
  }, "Perfil salvo.");
}

export async function savePeriodAction(_prev: FormState, formData: FormData): Promise<FormState> {
  return saveFromForm(periodFormSchema, formData, async (cuts) => {
    await saveSetting(await getDb(), "period", cuts);
  }, "Quinzenas atualizadas.");
}

export async function saveAlertsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  return saveFromForm(alertSettingsSchema, formData, async (data) => {
    await saveSetting(await getDb(), "alerts", data as AppSettings["alerts"]);
  }, "Alertas atualizados.");
}

export async function saveGoalDefaultsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  return saveFromForm(goalSettingsFormSchema, formData, async (data) => {
    await saveSetting(await getDb(), "goals", data);
  }, "Meta padrão salva.");
}

export async function saveCommissionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  return saveFromForm(commissionFormSchema, formData, async (data) => {
    await saveSetting(await getDb(), "commission", { ratePercent: data.ratePercent });
  }, "Comissão atualizada.");
}
