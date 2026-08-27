import { DomainError } from "./result";

export const GENERIC_ERROR = "Não foi possível salvar. Tente novamente.";

/** Mensagem segura para a UI: erros de domínio passam, o resto vira genérico (e vai para o log). */
export function errorMessage(error: unknown): string {
  if (error instanceof DomainError) return error.message;
  console.error("[action]", error);
  return GENERIC_ERROR;
}
