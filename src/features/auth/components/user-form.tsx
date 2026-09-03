"use client";

import { useActionState, useEffect, useRef } from "react";
import { Field, Input, Select } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { formErrors, IDLE } from "@/lib/result";
import { createUserAction } from "../actions";
import { PasswordField } from "./password-field";

export function UserForm({ leaders }: { leaders: { id: string; name: string }[] }) {
  const [state, action] = useActionState(createUserAction, IDLE);
  const ref = useRef<HTMLFormElement>(null);
  const errors = formErrors(state);
  useEffect(() => { if (state.status === "success") ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} action={action} className="grid gap-3 sm:grid-cols-2" noValidate>
      <Field label="Nome" htmlFor="user-name" error={errors.name} required><Input id="user-name" name="name" invalid={Boolean(errors.name)} /></Field>
      <Field label="Usuário" htmlFor="user-login" error={errors.login} required><Input id="user-login" name="login" autoCapitalize="none" invalid={Boolean(errors.login)} /></Field>
      <PasswordField label="Senha inicial" id="user-password" name="password" error={errors.password} />
      <Field label="Líder vinculado" htmlFor="user-leader" error={errors.leaderId} required>
        <Select id="user-leader" name="leaderId" invalid={Boolean(errors.leaderId)} defaultValue=""><option value="">Escolha o líder</option>{leaders.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</Select>
      </Field>
      <input type="hidden" name="role" value="leader" />
      <div className="sm:col-span-2"><FormAlert state={state} /></div>
      <div className="flex items-center justify-between gap-3 sm:col-span-2">
        <p className="text-[13px] text-muted">O líder verá somente os clientes atribuídos a ele.</p>
        <SubmitButton pendingLabel="Criando…">Criar acesso</SubmitButton>
      </div>
    </form>
  );
}
