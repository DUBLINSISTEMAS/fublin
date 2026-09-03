"use client";

import { useActionState, useEffect, useRef } from "react";
import { FormAlert } from "@/components/ui/form-alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { useActionToast } from "@/components/ui/toast";
import { formErrors, IDLE } from "@/lib/result";
import { changePasswordAction } from "../actions";
import { PasswordField } from "./password-field";

/** Troca da própria senha. As senhas nunca voltam do servidor: o formulário se limpa ao dar certo. */
export function AccountForm({ name, login }: { name: string; login: string }) {
  const [state, action] = useActionState(changePasswordAction, IDLE);
  const ref = useRef<HTMLFormElement>(null);
  useActionToast(state);
  const errors = formErrors(state);
  useEffect(() => {
    if (state.status === "success") ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={action} noValidate className="space-y-4">
      <p className="text-sm text-muted">
        Você entrou como <span className="font-medium text-ink">{name}</span> (@{login}). Ao trocar a senha, os outros aparelhos conectados com a senha antiga precisam entrar de novo.
      </p>
      <FormAlert state={state} />
      <div className="grid gap-3 sm:grid-cols-2">
        <PasswordField label="Senha atual" id="account-current" name="currentPassword" error={errors.currentPassword} autoComplete="current-password" className="sm:col-span-2" />
        <PasswordField label="Nova senha" id="account-password" name="password" error={errors.password} hint="Use pelo menos 8 caracteres." />
        <PasswordField label="Repita a nova senha" id="account-confirm" name="confirmPassword" error={errors.confirmPassword} />
      </div>
      <div className="flex justify-end">
        <SubmitButton size="sm" variant="secondary" pendingLabel="Trocando…">
          Trocar senha
        </SubmitButton>
      </div>
    </form>
  );
}
