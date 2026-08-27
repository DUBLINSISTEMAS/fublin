"use client";

import { useActionState } from "react";
import { Field, Input, Select } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { PhotoUpload } from "@/components/ui/photo-upload";
import { SubmitButton } from "@/components/ui/submit-button";
import { useActionToast } from "@/components/ui/toast";
import { REMINDER_OPTIONS } from "@/lib/domain";
import { centsToInput } from "@/lib/money";
import { formErrors, formValue, IDLE } from "@/lib/result";
import { saveAlertsAction, saveGoalDefaultsAction, savePeriodAction, saveProfileAction } from "../actions";
import type { AppSettings } from "../schema";

const REPEAT_OPTIONS = [
  { value: 0, label: "Avisar uma vez" },
  { value: 1, label: "A cada 1 min" },
  { value: 2, label: "A cada 2 min" },
  { value: 5, label: "A cada 5 min" },
  { value: 10, label: "A cada 10 min" },
];

export function ProfileForm({ profile }: { profile: AppSettings["profile"] }) {
  const [state, formAction] = useActionState(saveProfileAction, IDLE);
  useActionToast(state);
  const errors = formErrors(state);
  return (
    <form action={formAction} noValidate className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <PhotoUpload kind="perfil" name={profile.name} photoKey={profile.photoKey} size={72} className="mt-1" />
      <div className="flex-1 space-y-3">
        <FormAlert state={state} />
        <Field label="Seu nome" htmlFor="profile-name" required error={errors.name} hint="Aparece no topo do menu, no lugar de “Relacionador”.">
          <Input id="profile-name" name="name" defaultValue={formValue(state, "name", profile.name)} invalid={Boolean(errors.name)} autoComplete="name" />
        </Field>
        <div className="flex justify-end">
          <SubmitButton size="sm" variant="secondary">
            Salvar nome
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}

export function PeriodForm({ period }: { period: AppSettings["period"] }) {
  const [state, formAction] = useActionState(savePeriodAction, IDLE);
  useActionToast(state);
  const errors = formErrors(state);
  return (
    <form action={formAction} noValidate className="space-y-3">
      <FormAlert state={state} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="1ª quinzena começa no dia" htmlFor="firstCutDay" required error={errors.firstCutDay}>
          <Input id="firstCutDay" name="firstCutDay" type="number" inputMode="numeric" min={1} max={28} defaultValue={formValue(state, "firstCutDay", String(period.firstCutDay))} invalid={Boolean(errors.firstCutDay)} />
        </Field>
        <Field label="2ª quinzena começa no dia" htmlFor="secondCutDay" required error={errors.secondCutDay}>
          <Input id="secondCutDay" name="secondCutDay" type="number" inputMode="numeric" min={1} max={28} defaultValue={formValue(state, "secondCutDay", String(period.secondCutDay))} invalid={Boolean(errors.secondCutDay)} />
        </Field>
      </div>
      <p className="text-[13px] text-muted">
        Ex.: 5 e 20 → 1ª quinzena do dia 5 ao 19, 2ª do dia 20 ao 4 do mês seguinte. As duas juntas formam a produção do mês.
      </p>
      <div className="flex justify-end">
        <SubmitButton size="sm" variant="secondary">
          Salvar quinzenas
        </SubmitButton>
      </div>
    </form>
  );
}

export function GoalDefaultsForm({ goals }: { goals: AppSettings["goals"] }) {
  const [state, formAction] = useActionState(saveGoalDefaultsAction, IDLE);
  useActionToast(state);
  const errors = formErrors(state);
  return (
    <form action={formAction} noValidate className="space-y-3">
      <FormAlert state={state} />
      <Field label="Meta padrão por quinzena" htmlFor="defaultTarget" error={errors.defaultTarget} hint="Usada nas quinzenas sem meta própria. Você ajusta cada quinzena na aba Metas.">
        <div className="relative">
          <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[14px] text-muted">R$</span>
          <Input id="defaultTarget" name="defaultTarget" inputMode="decimal" defaultValue={formValue(state, "defaultTarget", centsToInput(goals.defaultTargetCents))} invalid={Boolean(errors.defaultTarget)} placeholder="700.000" className="pl-11" />
        </div>
      </Field>
      <div className="flex justify-end">
        <SubmitButton size="sm" variant="secondary">
          Salvar meta padrão
        </SubmitButton>
      </div>
    </form>
  );
}

export function AlertsForm({ alerts }: { alerts: AppSettings["alerts"] }) {
  const [state, formAction] = useActionState(saveAlertsAction, IDLE);
  useActionToast(state);
  const errors = formErrors(state);
  return (
    <form action={formAction} noValidate className="space-y-3">
      <FormAlert state={state} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Avisar antes do horário" htmlFor="leadMinutes" error={errors.leadMinutes} hint="Antecedência sugerida ao criar um agendamento.">
          <Select id="leadMinutes" name="leadMinutes" defaultValue={formValue(state, "leadMinutes", String(alerts.leadMinutes))}>
            {REMINDER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Repetir o alerta" htmlFor="repeatMinutes" error={errors.repeatMinutes} hint="Insiste até você dispensar ou dar baixa.">
          <Select id="repeatMinutes" name="repeatMinutes" defaultValue={formValue(state, "repeatMinutes", String(alerts.repeatMinutes))}>
            {REPEAT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <label className="flex cursor-pointer items-center gap-3 text-[14px] text-ink">
        <input type="checkbox" name="sound" defaultChecked={alerts.sound} className="size-5 accent-accent" />
        Tocar um som junto com o alerta
      </label>
      <div className="flex justify-end">
        <SubmitButton size="sm" variant="secondary">
          Salvar alertas
        </SubmitButton>
      </div>
    </form>
  );
}
