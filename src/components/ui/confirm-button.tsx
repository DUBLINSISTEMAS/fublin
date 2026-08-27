"use client";

import { useActionState, useState, type ReactNode } from "react";
import { OK, type ActionResult } from "@/lib/result";
import { ActionError } from "./action-error";
import { Button } from "./button";
import { SubmitButton } from "./submit-button";

type Props = {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  hidden: Record<string, string>;
  label: ReactNode;
  confirmLabel: string;
};

/** Exclusão em dois passos, sem `window.confirm`: clique, confirme inline. Erros do servidor aparecem ao lado. */
export function ConfirmButton({ action, hidden, label, confirmLabel }: Props) {
  const [arming, setArming] = useState(false);
  const [state, formAction] = useActionState(action, OK);
  if (!arming) {
    return (
      <Button variant="ghost" size="sm" className="text-rose-ink hover:bg-rose" onClick={() => setArming(true)}>
        {label}
      </Button>
    );
  }
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <span className="text-[13px] text-muted">Tem certeza?</span>
      <SubmitButton variant="danger" size="sm" pendingLabel="Excluindo…">
        {confirmLabel}
      </SubmitButton>
      <Button variant="ghost" size="sm" onClick={() => setArming(false)}>
        Cancelar
      </Button>
      <ActionError state={state} className="basis-full" />
    </form>
  );
}
