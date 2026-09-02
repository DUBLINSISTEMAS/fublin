"use client";

import { useActionState, useEffect, useRef } from "react";
import { Textarea } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { IDLE } from "@/lib/result";
import { addClientNoteAction } from "../actions";

export function NoteForm({ clientId }: { clientId: string }) {
  const [state, formAction] = useActionState(addClientNoteAction, IDLE);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

  const error = state.status === "error" ? state.fieldErrors?.content?.[0] : undefined;

  return (
    <form ref={formRef} action={formAction} className="rounded-[16px] border border-line bg-surface p-2 shadow-card focus-within:border-accent/50 focus-within:ring-4 focus-within:ring-accent/10">
      <input type="hidden" name="id" value={clientId} />
      <label htmlFor="note" className="sr-only">
        Novo comentário
      </label>
      <Textarea id="note" name="content" placeholder="Escreva uma atualização para a equipe, decisão ou próximo passo…" invalid={Boolean(error)} className="min-h-20 resize-none border-0 bg-transparent px-2 py-2 hover:bg-transparent focus:bg-transparent focus:ring-0" />
      {error ? (
        <p role="alert" className="text-[13px] text-rose-ink">
          {error}
        </p>
      ) : (
        <FormAlert state={state} />
      )}
      <div className="flex items-center justify-between gap-3 border-t border-line px-1 pt-2">
        <p role={state.status === "success" ? "status" : undefined} className={state.status === "success" ? "pl-1 text-[11px] font-medium text-lime-ink" : "pl-1 text-[11px] text-faint"}>{state.status === "success" ? state.message : "Todos com acesso a este cliente verão a mensagem."}</p>
        <SubmitButton size="sm" variant="secondary" pendingLabel="Salvando…">
          Comentar
        </SubmitButton>
      </div>
    </form>
  );
}
