"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db/client";
import { requireAdmin } from "@/features/auth/session";
import { goals } from "@/db/schema";
import { errorMessage } from "@/lib/actions";
import { toIso } from "@/lib/dates";
import { isValidPeriodKey } from "@/lib/quinzena";
import { formError, formSuccess, type FormState } from "@/lib/result";
import { moneyField, parseForm } from "@/lib/validation";

const goalSchema = z.object({
  periodKey: z.string().refine(isValidPeriodKey, "Quinzena inválida"),
  // Validar dentro do transform (com z.NEVER no caminho inválido) faz o Zod estreitar o tipo
  // para number: quem lê `data.target` depois não precisa de `!`.
  target: moneyField.transform((v, ctx) => {
    if (v === null || v <= 0) {
      ctx.addIssue({ code: "custom", message: "Informe a meta" });
      return z.NEVER;
    }
    return v;
  }),
});

/** Define (ou redefine) a meta de uma quinzena. */
export async function saveGoalAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = parseForm(goalSchema, formData);
  if (!parsed.ok) return formError("Confira a meta informada.", parsed.fieldErrors, parsed.values);
  try {
    const db = await getDb();
    const now = toIso(new Date());
    await db
      .insert(goals)
      .values({ periodKey: parsed.data.periodKey, targetCents: parsed.data.target, createdAt: now, updatedAt: now })
      .onConflictDoUpdate({ target: goals.periodKey, set: { targetCents: parsed.data.target, updatedAt: now } });
  } catch (error) {
    return formError(errorMessage(error), undefined, parsed.values);
  }
  revalidatePath("/", "layout");
  return formSuccess("Meta salva.");
}
