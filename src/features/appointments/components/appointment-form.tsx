"use client";

import { useActionState, useRef } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { useFocusFirstError } from "@/components/ui/use-focus-first-error";
import type { Appointment } from "@/db/schema";
import { cn } from "@/lib/cn";
import { fromIso, toLocalInput } from "@/lib/dates";
import { APPOINTMENT_KIND_LABELS, APPOINTMENT_KINDS, DEFAULT_REMINDER_MINUTES, REMINDER_OPTIONS } from "@/lib/domain";
import { formatPhone } from "@/lib/phone";
import { IDLE, type FormState } from "@/lib/result";
import type { ClientOption } from "@/features/clients/queries";

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  clients: ClientOption[];
  lockedClient?: ClientOption;
  initial?: Appointment;
  defaultDay?: string;
  returnTo: "agenda" | "cliente";
  cancelHref: string;
  submitLabel?: string;
};

export function AppointmentForm({ action, clients, lockedClient, initial, defaultDay, returnTo, cancelHref, submitLabel = "Salvar agendamento" }: Props) {
  const [state, formAction] = useActionState(action, IDLE);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(state, formRef);
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const value = (key: string, fallback: string | null | undefined) =>
    state.status === "error" && state.values ? (state.values[key] ?? "") : (fallback ?? "");

  const initialLocal = initial ? toLocalInput(fromIso(initial.scheduledAt)) : undefined;
  const kind = value("kind", initial?.kind ?? "visita");

  return (
    <form ref={formRef} action={formAction} noValidate className="space-y-8">
      <FormAlert state={state} />
      <input type="hidden" name="returnTo" value={returnTo} />

      <fieldset className="space-y-4">
        <legend className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted">Com quem</legend>
        {lockedClient ? (
          <div>
            <input type="hidden" name="clientId" value={lockedClient.id} />
            <p className="text-[15px] font-medium text-ink">{lockedClient.name}</p>
            <p className="text-[13px] text-muted">{formatPhone(lockedClient.phone)}</p>
          </div>
        ) : (
          <Field label="Cliente" htmlFor="clientId" required error={errors.clientId} hint={clients.length === 0 ? "Cadastre um cliente primeiro." : undefined}>
            <Select id="clientId" name="clientId" defaultValue={value("clientId", initial?.clientId)} invalid={Boolean(errors.clientId)} autoFocus>
              <option value="">Escolha o cliente…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {formatPhone(c.phone)}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted">O quê</legend>
        <div role="radiogroup" aria-label="Tipo" className="grid grid-cols-3 gap-2">
          {APPOINTMENT_KINDS.map((k) => (
            <label
              key={k}
              className={cn(
                "relative flex h-11 cursor-pointer items-center justify-center rounded-lg border text-sm font-medium transition-colors duration-150",
                "border-line-strong bg-surface text-ink-2 hover:bg-surface-2 has-checked:border-ink has-checked:bg-ink has-checked:text-white has-focus-visible:ring-2 has-focus-visible:ring-accent/40",
              )}
            >
              {/* O input ocupa o chip inteiro (invisível): clique e foco caem nele mesmo. */}
              <input type="radio" name="kind" value={k} defaultChecked={kind === k} className="absolute inset-0 cursor-pointer appearance-none opacity-0" />
              {APPOINTMENT_KIND_LABELS[k]}
            </label>
          ))}
        </div>
        {errors.kind ? (
          <p role="alert" className="text-[13px] text-red-600">
            {errors.kind[0]}
          </p>
        ) : null}
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted">Quando</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Data" htmlFor="day" required error={errors.day}>
            <Input id="day" name="day" type="date" defaultValue={value("day", initialLocal?.day ?? defaultDay)} invalid={Boolean(errors.day)} />
          </Field>
          <Field label="Horário" htmlFor="time" required error={errors.time}>
            <Input id="time" name="time" type="time" step={300} defaultValue={value("time", initialLocal?.time ?? "09:00")} invalid={Boolean(errors.time)} />
          </Field>
          <Field label="Lembrar" htmlFor="reminderMinutes" error={errors.reminderMinutes}>
            <Select id="reminderMinutes" name="reminderMinutes" defaultValue={value("reminderMinutes", String(initial?.reminderMinutes ?? DEFAULT_REMINDER_MINUTES))}>
              {REMINDER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Observação" htmlFor="notes" error={errors.notes}>
          <Textarea id="notes" name="notes" defaultValue={value("notes", initial?.notes)} placeholder="Ex.: trazer documentos, confirmar um dia antes…" className="min-h-20" />
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
