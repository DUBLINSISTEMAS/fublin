import { cn } from "@/lib/cn";
import type { ActionResult } from "@/lib/result";

/** Mensagem de erro de uma ação rápida (baixa, mover, excluir…); nada é renderizado quando deu certo. */
export function ActionError({ state, className }: { state: ActionResult; className?: string }) {
  if (state.ok) return null;
  return (
    <p role="alert" className={cn("text-[13px] text-rose-ink", className)}>
      {state.error}
    </p>
  );
}
