"use client";

import { useActionState } from "react";
import { Field, Input } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { formErrors, formValue, IDLE } from "@/lib/result";
import { loginAction, setupAction } from "../actions";
import { PasswordField } from "./password-field";

export function LoginForm({ setup, requireSetupSecret = false }: { setup: boolean; requireSetupSecret?: boolean }) {
  const [state, action] = useActionState(setup ? setupAction : loginAction, IDLE);
  const errors = formErrors(state);
  return (
    <form action={action} noValidate className="space-y-4">
      {setup ? (
        <Field label="Seu nome" htmlFor="name" error={errors.name} required>
          <Input id="name" name="name" autoComplete="name" defaultValue={formValue(state, "name", "")} invalid={Boolean(errors.name)} autoFocus />
        </Field>
      ) : null}
      {setup && requireSetupSecret ? (
        <Field label="Chave de instalação" htmlFor="setupSecret" error={errors.setupSecret} required>
          <Input id="setupSecret" name="setupSecret" type="password" autoComplete="off" invalid={Boolean(errors.setupSecret)} />
        </Field>
      ) : null}
      <Field label="Usuário" htmlFor="login" error={errors.login} hint={setup ? "Exemplo: anderson" : undefined} required>
        <Input id="login" name="login" autoCapitalize="none" autoCorrect="off" autoComplete="username" defaultValue={formValue(state, "login", "")} invalid={Boolean(errors.login)} autoFocus={!setup} />
      </Field>
      <PasswordField label="Senha" id="password" name="password" error={errors.password} hint={setup ? "Use pelo menos 8 caracteres." : undefined} autoComplete={setup ? "new-password" : "current-password"} />
      <FormAlert state={state} />
      <SubmitButton className="w-full" pendingLabel={setup ? "Criando acesso…" : "Entrando…"}>
        {setup ? "Criar meu acesso" : "Entrar"}
      </SubmitButton>
    </form>
  );
}
