"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Field, Input, Select } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { formErrors, IDLE } from "@/lib/result";
import { createUserAction } from "../actions";

export function UserForm({ leaders }: { leaders: { id: string; name: string }[] }) {
  const [state, action] = useActionState(createUserAction, IDLE);
  const ref = useRef<HTMLFormElement>(null);
  const errors = formErrors(state);
  const [showPassword, setShowPassword] = useState(false);
  useEffect(() => { if (state.status === "success") ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} action={action} className="grid gap-3 sm:grid-cols-2" noValidate>
      <Field label="Nome" htmlFor="user-name" error={errors.name} required><Input id="user-name" name="name" invalid={Boolean(errors.name)} /></Field>
      <Field label="Usuário" htmlFor="user-login" error={errors.login} required><Input id="user-login" name="login" autoCapitalize="none" invalid={Boolean(errors.login)} /></Field>
      <Field label="Senha inicial" htmlFor="user-password" error={errors.password} required><div className="relative"><Input id="user-password" name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" invalid={Boolean(errors.password)} className="pr-12" /><button type="button" onClick={() => setShowPassword((value) => !value)} className="icon-btn absolute top-1/2 right-1.5 -translate-y-1/2" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>{showPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}</button></div></Field>
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
