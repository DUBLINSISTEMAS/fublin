import { z } from "zod";
import { isInvalidMoney, parseBRL } from "./money";
import { formDataToObject, type FieldErrors } from "./result";

/** Campo opcional de formulário: string vazia (ou `null`, ao reaproveitar um objeto já validado) vira `undefined`. */
export function optionalString<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((value) => (value === null || (typeof value === "string" && value.trim() === "") ? undefined : value), schema.optional());
}

/** Teto de R$ 999.999.999,99 — cabe folgado num inteiro seguro e evita lixo no banco. */
export const MAX_MONEY_CENTS = 99_999_999_999;

/**
 * Campo de dinheiro digitado livremente ("300.000", "R$ 1.234,56") -> centavos ou null.
 * Vazio continua valendo (o dono não informou o valor); texto que não é número vira
 * erro na tela em vez de sumir virando `null`.
 */
export const moneyField = optionalString(z.string().max(40, "Valor muito longo"))
  .transform((value, ctx) => {
    const parsed = parseBRL(value ?? null);
    if (isInvalidMoney(parsed)) {
      ctx.addIssue({ code: "custom", message: "Valor inválido" });
      return z.NEVER;
    }
    return parsed;
  })
  .refine((v) => v === null || (v >= 0 && v <= MAX_MONEY_CENTS), "Valor inválido");

/** Checkbox de formulário: "on"/"true" vira `true`, ausente vira `false`. */
export const checkboxField = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());

/** Ações que só recebem o id do registro (excluir, ativar/desativar). */
export const idSchema = z.object({ id: z.string().trim().min(1).max(64) });

export type ParseResult<T> =
  | { ok: true; data: T; values: Record<string, string> }
  | { ok: false; fieldErrors: FieldErrors; values: Record<string, string> };

/** Valida um FormData contra um schema, devolvendo erros por campo prontos para a UI. */
export function parseForm<T extends z.ZodTypeAny>(schema: T, formData: FormData): ParseResult<z.output<T>> {
  const values = formDataToObject(formData);
  const result = schema.safeParse(values);
  if (result.success) return { ok: true, data: result.data, values };
  const { fieldErrors } = z.flattenError(result.error);
  return { ok: false, fieldErrors: fieldErrors as FieldErrors, values };
}
