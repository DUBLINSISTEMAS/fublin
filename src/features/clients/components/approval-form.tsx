"use client";

import { useActionState, useRef } from "react";
import { Field, Input } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { MoneyInput } from "@/components/ui/money-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { useFocusFirstError } from "@/components/ui/use-focus-first-error";
import type { Client } from "@/db/schema";
import { formatPercent } from "@/features/goals/commission";
import { fromIso, toLocalInput } from "@/lib/dates";
import { centsToInput } from "@/lib/money";
import { formErrors, formValue, IDLE } from "@/lib/result";
import { updateApprovalAction } from "../actions";

type Props = { client: Client; /** Taxa das configurações, usada quando a venda não tem a própria. */ defaultRatePercent: number };

/** "0,5" para o campo de porcentagem; vazio quando a venda usa o padrão. */
function rateToInput(rate: number | null): string {
  return rate === null ? "" : String(rate).replace(".", ",");
}

/** Valores e datas da aprovação/fechamento — o que vai para a aba Aprovados. */
export function ApprovalForm({ client, defaultRatePercent }: Props) {
  const [state, formAction] = useActionState(updateApprovalAction, IDLE);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(state, formRef);
  const errors = formErrors(state);
  const value = (key: string, fallback: string) => formValue(state, key, fallback);
  const day = (iso: string | null) => (iso ? toLocalInput(fromIso(iso)).day : "");
  const defaultRate = formatPercent(defaultRatePercent);

  return (
    <form ref={formRef} action={formAction} noValidate className="space-y-3">
      <input type="hidden" name="id" value={client.id} />
      <FormAlert state={state} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        <Field label="Valor da carta" htmlFor="ap-credit" error={errors.credit}>
          <MoneyInput id="ap-credit" name="credit" defaultValue={value("credit", centsToInput(client.creditCents))} invalid={Boolean(errors.credit)} placeholder="0,00" className="h-11" />
        </Field>
        <Field label="Adesão" htmlFor="ap-adesao" error={errors.adesao} hint="Quanto o cliente pagou de adesão.">
          <MoneyInput id="ap-adesao" name="adesao" defaultValue={value("adesao", centsToInput(client.adesaoCents))} invalid={Boolean(errors.adesao)} placeholder="0,00" className="h-11" />
        </Field>
        <Field label="Comissão desta venda" htmlFor="ap-rate" error={errors.commissionRate} hint={`Padrão ${defaultRate}. Vendeu melhor? Coloque 0,5 e esta carta conta com 0,5%. Vazio volta ao padrão.`}>
          <div className="relative">
            <Input
              id="ap-rate"
              name="commissionRate"
              inputMode="decimal"
              defaultValue={value("commissionRate", rateToInput(client.commissionRatePercent))}
              placeholder={rateToInput(defaultRatePercent)}
              invalid={Boolean(errors.commissionRate)}
              className="h-11 pr-10 tabular-nums"
            />
            <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-[14px] text-muted">%</span>
          </div>
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
