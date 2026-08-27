"use client";

import { useActionState, useEffect, useRef } from "react";
import { Field, Input } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { formErrors, IDLE } from "@/lib/result";
import { createLeaderAction } from "../actions";

export function LeaderForm() {
  const [state, formAction] = useActionState(createLeaderAction, IDLE);
  const formRef = useRef<HTMLFormElement>(null);
  const errors = formErrors(state);

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} noValidate className="space-y-3">
      <FormAlert state={state} />
      <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto] sm:items-end">
        <Field label="Nome" htmlFor="leader-name" required error={errors.name}>
          <Input id="leader-name" name="name" placeholder="Nome do líder" invalid={Boolean(errors.name)} />
        </Field>
        <Field label="Telefone" htmlFor="leader-phone" error={errors.phone}>
          <Input id="leader-phone" name="phone" type="tel" inputMode="tel" placeholder="opcional" />
        </Field>
        <SubmitButton pendingLabel="Adicionando…">Adicionar</SubmitButton>
      </div>
    </form>
  );
}
