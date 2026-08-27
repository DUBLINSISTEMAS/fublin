import { CircleAlert } from "lucide-react";
import type { FormState } from "@/lib/result";

/** Mensagem geral de erro de um formulário (erros de campo ficam no Field). */
export function FormAlert({ state }: { state: FormState }) {
  if (state.status !== "error") return null;
  return (
    <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-800">
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{state.message}</span>
    </div>
  );
}
