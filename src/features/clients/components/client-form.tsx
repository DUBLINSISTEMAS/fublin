"use client";

import { useActionState, useRef } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { useFocusFirstError } from "@/components/ui/use-focus-first-error";
import type { Client, Leader } from "@/db/schema";
import { fromIso, toLocalInput } from "@/lib/dates";
import {
  CLIENT_STATUS_LABELS,
  CLIENT_STATUSES,
  INTEREST_LABELS,
  INTERESTS,
  SOURCE_LABELS,
  SOURCES,
} from "@/lib/domain";
import { IDLE, type FormState } from "@/lib/result";

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
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const value = (key: string, fallback: string | null | undefined) =>
    state.status === "error" && state.values ? (state.values[key] ?? "") : (fallback ?? "");

  const firstVisitDay = initial?.firstVisitAt ? toLocalInput(fromIso(initial.firstVisitAt)).day : "";
  const isEdit = Boolean(initial);
  const leaderOptions = leaders.filter((l) => l.active || l.id === initial?.leaderId);

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
          <Field label="Detalhe do interesse" htmlFor="interestNotes" error={errors.interestNotes} hint="Ex.: carta de R$ 300 mil, apartamento na zona sul">
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
          <Field label="Dia em que veio à loja" htmlFor="firstVisitDay" error={errors.firstVisitDay} hint="Deixe vazio se ainda não veio.">
            <Input id="firstVisitDay" name="firstVisitDay" type="date" defaultValue={value("firstVisitDay", firstVisitDay)} invalid={Boolean(errors.firstVisitDay)} />
          </Field>
          {isEdit ? (
            <Field label="Status" htmlFor="status" error={errors.status}>
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

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <ButtonLink href={cancelHref} variant="ghost">
          Cancelar
        </ButtonLink>
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
