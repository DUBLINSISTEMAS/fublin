"use client";

import { useActionState, useRef } from "react";
import { Field, Input } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { useFocusFirstError } from "@/components/ui/use-focus-first-error";
import type { Client } from "@/db/schema";
import { fromIso, toLocalInput } from "@/lib/dates";
import { centsToInput } from "@/lib/money";
import { formErrors, formValue, IDLE } from "@/lib/result";
import { updateApprovalAction } from "../actions";

/** Valores e datas da aprovação/fechamento — o que vai para a aba Aprovados. */
export function ApprovalForm({ client }: { client: Client }) {
  const [state, formAction] = useActionState(updateApprovalAction, IDLE);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(state, formRef);
  const errors = formErrors(state);
  const value = (key: string, fallback: string) => formValue(state, key, fallback);
  const day = (iso: string | null) => (iso ? toLocalInput(fromIso(iso)).day : "");

  return (
    <form ref={formRef} action={formAction} noValidate className="space-y-3">
      <input type="hidden" name="id" value={client.id} />
      <FormAlert state={state} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        <Field label="Valor da carta" htmlFor="ap-credit" error={errors.credit}>
          <Money id="ap-credit" name="credit" defaultValue={value("credit", centsToInput(client.creditCents))} invalid={Boolean(errors.credit)} />
        </Field>
        <Field label="Adesão" htmlFor="ap-adesao" error={errors.adesao} hint="Quanto o cliente pagou de adesão.">
          <Money id="ap-adesao" name="adesao" defaultValue={value("adesao", centsToInput(client.adesaoCents))} invalid={Boolean(errors.adesao)} />
        </Field>
        <Field label="Aprovado em" htmlFor="ap-approved" error={errors.approvedDay}>
          <Input id="ap-approved" name="approvedDay" type="date" defaultValue={value("approvedDay", day(client.approvedAt))} invalid={Boolean(errors.approvedDay)} className="h-11" />
        </Field>
        <Field label="Fechou em" htmlFor="ap-closed" error={errors.closedDay}>
          <Input id="ap-closed" name="closedDay" type="date" defaultValue={value("closedDay", day(client.closedAt))} invalid={Boolean(errors.closedDay)} className="h-11" />
        </Field>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] text-lime-ink" aria-live="polite">
          {state.status === "success" ? "Salvo." : ""}
        </span>
        <SubmitButton size="sm" variant="secondary">
          Salvar aprovação
        </SubmitButton>
      </div>
    </form>
  );
}

function Money({ id, name, defaultValue, invalid }: { id: string; name: string; defaultValue: string; invalid: boolean }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[14px] text-muted">R$</span>
      <Input id={id} name={name} inputMode="decimal" defaultValue={defaultValue} invalid={invalid} placeholder="0,00" className="h-11 pl-11" />
    </div>
  );
}
