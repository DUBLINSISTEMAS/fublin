"use client";

import { useActionState, useState } from "react";
import { ActionError } from "@/components/ui/action-error";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { useActionToast } from "@/components/ui/toast";
import { USER_ROLE_LABELS } from "@/lib/domain";
import { formErrors, IDLE, OK } from "@/lib/result";
import type { ManagedUser } from "../service";
import { resetPasswordAction, toggleUserAction, unlockUserAction } from "../actions";
import { PasswordField } from "./password-field";

type Props = {
  user: ManagedUser;
  leaderName?: string;
  current: boolean;
  /** "Bloqueado até 14:32" — só vem preenchido enquanto o bloqueio por senha errada vale. */
  lockedLabel?: string;
};

export function UserRow({ user, leaderName, current, lockedLabel }: Props) {
  const [state, action, pending] = useActionState(toggleUserAction, OK);
  const [unlockState, unlockAction] = useActionState(unlockUserAction, OK);
  const [resetting, setResetting] = useState(false);
  useActionToast(state, user.active ? "Acesso desativado." : "Acesso ativado.");
  useActionToast(unlockState, "Acesso desbloqueado.");

  return (
    <li className="px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="min-w-0 flex-1">
          <span className="block font-medium text-ink">
            {user.name}
            {current ? " (você)" : ""}
          </span>
          <span className="block text-[13px] text-muted">
            @{user.login} · {user.role === "admin" ? USER_ROLE_LABELS.admin : (leaderName ?? USER_ROLE_LABELS.leader)}
          </span>
        </span>
        {lockedLabel ? <span className="rounded-full bg-sun px-2.5 py-1 text-xs text-sun-ink">{lockedLabel}</span> : null}
        <span className={user.active ? "rounded-full bg-lime-soft px-2.5 py-1 text-xs text-lime-ink" : "rounded-full bg-surface-3 px-2.5 py-1 text-xs text-muted"}>
          {user.active ? "Ativo" : "Desativado"}
        </span>
        {lockedLabel ? (
          <form action={unlockAction}>
            <input type="hidden" name="id" value={user.id} />
            <SubmitButton size="sm" variant="secondary" pendingLabel="…">
              Desbloquear
            </SubmitButton>
          </form>
        ) : null}
        {!current ? (
          <>
            <Button size="sm" variant="ghost" onClick={() => setResetting((value) => !value)} aria-expanded={resetting}>
              {resetting ? "Cancelar" : "Redefinir senha"}
            </Button>
            <form action={action}>
              <input type="hidden" name="id" value={user.id} />
              <input type="hidden" name="active" value={String(!user.active)} />
              <Button type="submit" size="sm" variant="secondary" disabled={pending}>
                {user.active ? "Desativar" : "Ativar"}
              </Button>
            </form>
          </>
        ) : null}
        <ActionError state={state} className="basis-full" />
        <ActionError state={unlockState} className="basis-full" />
      </div>
      {resetting ? <ResetPasswordForm user={user} onDone={() => setResetting(false)} /> : null}
    </li>
  );
}

/** Senha nova para quem esqueceu a dela: derruba as sessões e libera o bloqueio. */
function ResetPasswordForm({ user, onDone }: { user: ManagedUser; onDone: () => void }) {
  const [state, action] = useActionState(resetPasswordAction, IDLE);
  useActionToast(state);
  const errors = formErrors(state);

  // Estado derivado durante o render: ao redefinir com sucesso, o formulário se fecha.
  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    if (state.status === "success") onDone();
  }

  return (
    <form action={action} noValidate className="mt-3 space-y-3 rounded-card bg-surface-2 p-3">
      <input type="hidden" name="id" value={user.id} />
      <p className="text-[13px] text-muted">
        Escolha a senha nova de <span className="font-medium text-ink">{user.name}</span> e avise a pessoa. Os aparelhos dela precisam entrar de novo.
      </p>
      <FormAlert state={state} />
      <div className="grid gap-3 sm:grid-cols-2">
        <PasswordField label="Nova senha" id={`reset-password-${user.id}`} name="password" error={errors.password} hint="Use pelo menos 8 caracteres." autoFocus />
        <PasswordField label="Repita a nova senha" id={`reset-confirm-${user.id}`} name="confirmPassword" error={errors.confirmPassword} />
      </div>
      <div className="flex justify-end">
        <SubmitButton size="sm" variant="secondary" pendingLabel="Redefinindo…">
          Salvar nova senha
        </SubmitButton>
      </div>
    </form>
  );
}
