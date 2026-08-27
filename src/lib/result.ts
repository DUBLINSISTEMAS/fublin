/** Erros por campo, chaveados pelo `name` do input. */
export type FieldErrors = Record<string, string[] | undefined>;

/**
 * Estado devolvido por server actions de formulário para `useActionState`.
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

/** Erros de campo do estado atual (objeto vazio fora do estado de erro). */
export function formErrors(state: FormState): FieldErrors {
  return state.status === "error" ? (state.fieldErrors ?? {}) : {};
}

/**
 * Valor para repovoar um input depois de um erro: o que o usuário digitou
 * tem prioridade sobre o valor inicial vindo do banco.
 */
export function formValue(state: FormState, key: string, fallback: string | null | undefined): string {
  if (state.status === "error" && state.values) return state.values[key] ?? "";
  return fallback ?? "";
}

/**
 * Resultado de ações rápidas (baixa, mover, excluir…): não há formulário com
 * campos para devolver, mas a UI precisa saber se deu certo para avisar o usuário.
 */
export type ActionResult = { ok: true } | { ok: false; error: string };

export const OK: ActionResult = { ok: true };

export function actionError(error: string): ActionResult {
  return { ok: false, error };
}

/** Erro de domínio com mensagem pronta para o usuário (pt-BR). */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainError";
  }
}

/** Converte FormData em objeto simples de strings (arquivos são ignorados). */
export function formDataToObject(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") out[key] = value;
  }
  return out;
}
