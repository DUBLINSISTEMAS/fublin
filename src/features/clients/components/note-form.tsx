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
    <form ref={formRef} action={formAction} className="space-y-2">
      <input type="hidden" name="id" value={clientId} />
      <label htmlFor="note" className="sr-only">
        Nova nota
      </label>
      <Textarea id="note" name="content" placeholder="Anote o que foi conversado, próximos passos…" invalid={Boolean(error)} className="min-h-20" />
      {error ? (
        <p role="alert" className="text-[13px] text-rose-ink">
          {error}
        </p>
      ) : (
        <FormAlert state={state} />
      )}
      <div className="flex justify-end">
        <SubmitButton size="sm" variant="secondary" pendingLabel="Salvando…">
          Adicionar nota
        </SubmitButton>
      </div>
    </form>
  );
}
