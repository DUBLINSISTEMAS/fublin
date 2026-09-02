"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Field, Input } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { formErrors, formValue, IDLE } from "@/lib/result";
import { loginAction, setupAction } from "../actions";

export function LoginForm({ setup, requireSetupSecret = false }: { setup: boolean; requireSetupSecret?: boolean }) {
  const [state, action] = useActionState(setup ? setupAction : loginAction, IDLE);
  const [showPassword, setShowPassword] = useState(false);
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
      <Field label="Senha" htmlFor="password" error={errors.password} hint={setup ? "Use pelo menos 8 caracteres." : undefined} required>
        <div className="relative"><Input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete={setup ? "new-password" : "current-password"} invalid={Boolean(errors.password)} className="pr-12" /><button type="button" onClick={() => setShowPassword((value) => !value)} className="icon-btn absolute top-1/2 right-1.5 -translate-y-1/2" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>{showPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}</button></div>
      </Field>
      <FormAlert state={state} />
      <SubmitButton className="w-full" pendingLabel={setup ? "Criando acesso…" : "Entrando…"}>
        {setup ? "Criar meu acesso" : "Entrar"}
      </SubmitButton>
    </form>
  );
}
