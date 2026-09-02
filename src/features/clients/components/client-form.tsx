"use client";

import { useActionState, useRef } from "react";
import { Store, Video } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { MoneyInput } from "@/components/ui/money-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { useFocusFirstError } from "@/components/ui/use-focus-first-error";
import type { Client, Leader } from "@/db/schema";
import { cn } from "@/lib/cn";
import { fromIso, toLocalInput } from "@/lib/dates";
import {
  ATTENDANCE_LABELS,
  ATTENDANCES,
  CLIENT_STATUS_LABELS,
  CLIENT_STATUSES,
  INTEREST_LABELS,
  INTERESTS,
  SOURCE_LABELS,
  SOURCES,
} from "@/lib/domain";
import { centsToInput } from "@/lib/money";
import { formErrors, formValue, IDLE, type FormState } from "@/lib/result";

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  leaders: Pick<Leader, "id" | "name" | "active">[];
  initial?: Client;
  cancelHref: string;
  submitLabel?: string;
};

export function ClientForm({ action, leaders, initial, cancelHref, submitLabel = "Salvar cliente" }: Props) {
  const [state, formAction] = useActionState(action, IDLE);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(state, formRef);
  const errors = formErrors(state);
  const value = (key: string, fallback: string | null | undefined) => formValue(state, key, fallback);

  const firstVisitDay = initial?.firstVisitAt ? toLocalInput(fromIso(initial.firstVisitAt)).day : "";
  const isEdit = Boolean(initial);
  const leaderOptions = leaders.filter((l) => l.active || l.id === initial?.leaderId);
  const attendance = value("attendance", initial?.attendance ?? "presencial");

  return (
    <form ref={formRef} action={formAction} noValidate className="space-y-8">
      <FormAlert state={state} />

      <fieldset className="space-y-4">
        <legend className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted">Contato</legend>
        <Field label="Nome" htmlFor="name" required error={errors.name}>
          <Input id="name" name="name" autoComplete="name" autoFocus={!isEdit} defaultValue={value("name", initial?.name)} invalid={Boolean(errors.name)} placeholder="Nome completo" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Telefone" htmlFor="phone" required error={errors.phone} hint="Com DDD. Usado para WhatsApp e ligação.">
            <Input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" defaultValue={value("phone", initial?.phone)} invalid={Boolean(errors.phone)} placeholder="(11) 98765-4321" />
          </Field>
          <Field label="E-mail" htmlFor="email" error={errors.email}>
            <Input id="email" name="email" type="email" inputMode="email" autoComplete="email" defaultValue={value("email", initial?.email)} invalid={Boolean(errors.email)} placeholder="opcional" />
          </Field>
        </div>
        <div>
          <p className="mb-1.5 text-[13px] font-medium text-ink-2">Atendimento</p>
          <div role="radiogroup" aria-label="Atendimento" className="grid grid-cols-2 gap-2">
            {ATTENDANCES.map((a) => {
              const Icon = a === "online" ? Video : Store;
              return (
                <label
                  key={a}
                  className={cn(
                    "relative flex h-12 cursor-pointer items-center justify-center gap-2 rounded-control border text-[14px] font-medium transition-colors duration-150",
                    "border-transparent bg-surface-2 text-ink-2 hover:bg-surface-3 has-checked:bg-dark has-checked:text-white has-focus-visible:ring-2 has-focus-visible:ring-accent/40",
                  )}
                >
                  <input type="radio" name="attendance" value={a} defaultChecked={attendance === a} className="absolute inset-0 cursor-pointer appearance-none opacity-0" />
                  <Icon className="size-4" aria-hidden />
                  {ATTENDANCE_LABELS[a]}
                </label>
              );
            })}
          </div>
          <p className="mt-1.5 text-[13px] text-muted">Presencial: você traz o cliente à loja. Online: cliente de longe, tudo por videochamada.</p>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted">Interesse</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Interesse" htmlFor="interest" required error={errors.interest}>
            <Select id="interest" name="interest" defaultValue={value("interest", initial?.interest)} invalid={Boolean(errors.interest)}>
              <option value="">Escolha…</option>
              {INTERESTS.map((i) => (
                <option key={i} value={i}>
                  {INTEREST_LABELS[i]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Valor da carta" htmlFor="credit" error={errors.credit} hint="Crédito pretendido. Ex.: 300.000,00">
            <MoneyInput id="credit" name="credit" defaultValue={value("credit", centsToInput(initial?.creditCents))} invalid={Boolean(errors.credit)} placeholder="0,00" />
          </Field>
          <Field label="Detalhe do interesse" htmlFor="interestNotes" error={errors.interestNotes} hint="Ex.: apartamento na zona sul, SUV até 120 mil">
            <Input id="interestNotes" name="interestNotes" defaultValue={value("interestNotes", initial?.interestNotes)} invalid={Boolean(errors.interestNotes)} placeholder="opcional" />
          </Field>
          <Field label="Origem" htmlFor="source" error={errors.source}>
            <Select id="source" name="source" defaultValue={value("source", initial?.source)}>
              <option value="">Não informada</option>
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {SOURCE_LABELS[s]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Líder de vendas" htmlFor="leaderId" error={errors.leaderId} hint={leaderOptions.length === 0 ? "Cadastre líderes na aba Líderes." : undefined}>
            <Select id="leaderId" name="leaderId" defaultValue={value("leaderId", initial?.leaderId)}>
              <option value="">Ainda não definido</option>
              {leaderOptions.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Primeiro atendimento" htmlFor="firstVisitDay" error={errors.firstVisitDay} hint="Dia em que falou com o líder (loja ou online). Deixe vazio se ainda não aconteceu.">
            <Input id="firstVisitDay" name="firstVisitDay" type="date" defaultValue={value("firstVisitDay", firstVisitDay)} invalid={Boolean(errors.firstVisitDay)} />
          </Field>
          {isEdit ? (
            <Field label="Etapa do funil" htmlFor="status" error={errors.status}>
              <Select id="status" name="status" defaultValue={value("status", initial?.status)}>
                {CLIENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {CLIENT_STATUS_LABELS[s]}
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <input type="hidden" name="status" value="novo" />
          )}
        </div>
        <Field label="Observações" htmlFor="notes" error={errors.notes}>
          <Textarea id="notes" name="notes" defaultValue={value("notes", initial?.notes)} placeholder="Preferências, horários, contexto da conversa…" />
        </Field>
      </fieldset>

      <div className="sticky bottom-20 z-10 -mx-2 flex gap-2 rounded-[18px] glass-bar p-2 sm:static sm:mx-0 sm:justify-end sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-none">
        <ButtonLink href={cancelHref} variant="ghost" className="flex-1 sm:flex-none">
          Cancelar
        </ButtonLink>
        <SubmitButton className="flex-1 sm:flex-none">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
