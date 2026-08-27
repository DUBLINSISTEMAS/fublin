"use client";

import { useState, type ReactNode } from "react";
import { Button } from "./button";
import { SubmitButton } from "./submit-button";

type Props = { action: (formData: FormData) => void | Promise<void>; hidden: Record<string, string>; label: ReactNode; confirmLabel: string };

/** Exclusão em dois passos, sem `window.confirm`: clique, confirme inline. */
export function ConfirmButton({ action, hidden, label, confirmLabel }: Props) {
  const [arming, setArming] = useState(false);
  if (!arming) {
    return (
      <Button variant="ghost" size="sm" className="text-rose-700 hover:bg-rose-50 hover:text-rose-800" onClick={() => setArming(true)}>
        {label}
      </Button>
    );
  }
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
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
    </form>
  );
}
