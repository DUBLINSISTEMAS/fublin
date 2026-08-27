/** Erros por campo, chaveados pelo `name` do input. */
export type FieldErrors = Record<string, string[] | undefined>;

/**
 * Estado devolvido por server actions para `useActionState`.
 * `values` devolve o que o usuário digitou para o form não perder os dados.
 */
export type FormState =
  | { status: "idle" }
  | { status: "error"; message: string; fieldErrors?: FieldErrors; values?: Record<string, string> }
  | { status: "success"; message?: string };

export const IDLE: FormState = { status: "idle" };

export function formError(message: string, fieldErrors?: FieldErrors, values?: Record<string, string>): FormState {
  return { status: "error", message, fieldErrors, values };
}

export function formSuccess(message?: string): FormState {
  return { status: "success", message };
}

/** Erro de domínio com mensagem pronta para o usuário (pt-BR). */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainError";
  }
}

/** Converte FormData em objeto simples de strings. */
export function formDataToObject(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") out[key] = value;
  }
  return out;
}
