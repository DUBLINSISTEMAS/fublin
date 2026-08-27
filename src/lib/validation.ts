import { z } from "zod";
import { formDataToObject, type FieldErrors } from "./result";

/** Campo opcional de formulário: string vazia vira `undefined`. */
export function optionalString<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((value) => (typeof value === "string" && value.trim() === "" ? undefined : value), schema.optional());
}

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
