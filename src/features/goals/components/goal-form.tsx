"use client";

import { useActionState, useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { useActionToast } from "@/components/ui/toast";
import { centsToInput, formatBRL } from "@/lib/money";
import { formErrors, formValue, IDLE } from "@/lib/result";
import { saveGoalAction } from "../actions";

type Props = { periodKey: string; targetCents: number | null; isDefault: boolean };

/** Define a meta da quinzena ali mesmo, no card. */
export function GoalForm({ periodKey, targetCents, isDefault }: Props) {
  const [editing, setEditing] = useState(targetCents === null);
  const [state, formAction] = useActionState(saveGoalAction, IDLE);
  useActionToast(state);
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    if (state.status === "success") setEditing(false);
  }
  const errors = formErrors(state);

  if (!editing) {
    return (
      <div className="flex flex-wrap items-center gap-3 text-[13px] text-muted">
        <span>
          Meta: <span className="font-medium text-ink">{formatBRL(targetCents)}</span>
          {isDefault ? " (padrão das configurações)" : ""}
        </span>
        <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
          <Pencil className="size-3.5" aria-hidden />
          {isDefault ? "Definir meta própria" : "Alterar"}
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} noValidate className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="periodKey" value={periodKey} />
      <Field label="Meta da quinzena" htmlFor={`goal-${periodKey}`} error={errors.target} className="w-56">
        <div className="relative">
          <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[14px] text-muted">R$</span>
          <Input id={`goal-${periodKey}`} name="target" inputMode="decimal" defaultValue={formValue(state, "target", centsToInput(targetCents))} invalid={Boolean(errors.target)} placeholder="700.000" className="h-11 pl-11" autoFocus />
        </div>
      </Field>
      <SubmitButton size="md" className="h-11">
        Salvar meta
      </SubmitButton>
      {targetCents !== null ? (
        <Button size="md" variant="ghost" className="h-11" onClick={() => setEditing(false)}>
          Cancelar
        </Button>
      ) : null}
    </form>
  );
}
