"use client";

import { useActionState, useState } from "react";
import { Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { MoneyInput } from "@/components/ui/money-input";
import { PhotoUpload } from "@/components/ui/photo-upload";
import { SubmitButton } from "@/components/ui/submit-button";
import { useActionToast } from "@/components/ui/toast";
import { REMINDER_OPTIONS } from "@/lib/domain";
import { centsToInput } from "@/lib/money";
import { periodDatesLabel, periodFor, periodTitle } from "@/lib/quinzena";
import { formErrors, formValue, IDLE } from "@/lib/result";
import { playSound, SOUND_OPTIONS, unlockAudio, type SoundId } from "@/lib/sounds";
import { saveAlertsAction, saveCommissionAction, saveGoalDefaultsAction, savePeriodAction, saveProfileAction } from "../actions";
import { formatPercent } from "@/features/goals/commission";
import { cutsFromRange, DEFAULT_COMMISSION_PERCENT, rangeFromCuts, type AppSettings } from "../schema";

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
        <Field label="Seu nome" htmlFor="profile-name" required error={errors.name} hint="Aparece no topo do menu e na saudação da tela Hoje.">
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

const clampDay = (v: string, min: number, max: number) => {
  const n = Number(v);
  return Number.isFinite(n) && v !== "" ? Math.min(Math.max(Math.trunc(n), min), max) : null;
};

export function PeriodForm({ period }: { period: AppSettings["period"] }) {
  const [state, formAction] = useActionState(savePeriodAction, IDLE);
  useActionToast(state);
  const errors = formErrors(state);
  const initial = rangeFromCuts(period);
  const [firstStart, setFirstStart] = useState(formValue(state, "firstStart", String(initial.firstStart)));
  const [firstEnd, setFirstEnd] = useState(formValue(state, "firstEnd", String(initial.firstEnd)));

  // Prévia ao vivo: a 2ª quinzena é o complemento da 1ª, e mostramos em qual estamos hoje.
  const start = clampDay(firstStart, 1, 27);
  const end = clampDay(firstEnd, 2, 27);
  const valid = start !== null && end !== null && start < end;
  const preview = valid ? periodFor(new Date(), cutsFromRange(start, end)) : null;

  return (
    <form action={formAction} noValidate className="space-y-4">
      <FormAlert state={state} />
      <div className="rounded-card bg-surface-2 p-3.5">
        <p className="text-[12px] font-medium uppercase tracking-wide text-muted">1ª quinzena</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[15px] text-ink">
          do dia
          <span className="inline-block w-20 shrink-0">
            <Input id="firstStart" name="firstStart" type="number" inputMode="numeric" min={1} max={27} value={firstStart} onChange={(e) => setFirstStart(e.target.value)} invalid={Boolean(errors.firstStart)} aria-label="1ª quinzena começa no dia" className="h-10 px-3 text-center" />
          </span>
          ao dia
          <span className="inline-block w-20 shrink-0">
            <Input id="firstEnd" name="firstEnd" type="number" inputMode="numeric" min={2} max={27} value={firstEnd} onChange={(e) => setFirstEnd(e.target.value)} invalid={Boolean(errors.firstEnd)} aria-label="1ª quinzena termina no dia" className="h-10 px-3 text-center" />
          </span>
        </div>
        {errors.firstStart || errors.firstEnd ? (
          <p role="alert" className="mt-2 text-[13px] text-rose-ink">
            {errors.firstStart?.[0] ?? errors.firstEnd?.[0]}
          </p>
        ) : null}
      </div>
      <div className="rounded-card bg-surface-2 p-3.5">
        <p className="text-[12px] font-medium uppercase tracking-wide text-muted">2ª quinzena</p>
        <p className="mt-2 text-[15px] text-ink">
          {valid ? (
            <>
              do dia <span className="font-medium">{end + 1}</span> ao dia <span className="font-medium">{start - 1 === 0 ? "último" : start - 1}</span> do mês seguinte
            </>
          ) : (
            <span className="text-muted">Preencha a 1ª quinzena.</span>
          )}
        </p>
        <p className="mt-1 text-[13px] text-muted">Calculada sozinha: é o resto do mês. As duas juntas formam a produção do mês.</p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-muted">
          {preview ? (
            <>
              Hoje estamos na <span className="font-medium text-ink">{periodTitle(preview)}</span> · {periodDatesLabel(preview)}
            </>
          ) : null}
        </p>
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
        <MoneyInput id="defaultTarget" name="defaultTarget" defaultValue={formValue(state, "defaultTarget", centsToInput(goals.defaultTargetCents))} invalid={Boolean(errors.defaultTarget)} placeholder="700.000,00" />
      </Field>
      <div className="flex justify-end">
        <SubmitButton size="sm" variant="secondary">
          Salvar meta padrão
        </SubmitButton>
      </div>
    </form>
  );
}

export function CommissionForm({ commission }: { commission: AppSettings["commission"] }) {
  const [state, formAction] = useActionState(saveCommissionAction, IDLE);
  useActionToast(state);
  const errors = formErrors(state);
  const current = String(commission.ratePercent).replace(".", ",");
  const [value, setValue] = useState(formValue(state, "ratePercent", current));
  const changed = value.replace(".", ",") !== current;
  const [confirmed, setConfirmed] = useState(false);
  return (
    <form action={formAction} noValidate className="space-y-3">
      <FormAlert state={state} />
      <Field label="Comissão sobre cada carta fechada" htmlFor="ratePercent" error={errors.ratePercent} hint={`Padrão ${formatPercent(DEFAULT_COMMISSION_PERCENT)}: em R$ 100 mil de carta você recebe R$ 400.`}>
        <div className="relative w-40">
          <Input id="ratePercent" name="ratePercent" inputMode="decimal" value={value} onChange={(e) => { setValue(e.target.value); setConfirmed(false); }} invalid={Boolean(errors.ratePercent)} className="pr-10 tabular-nums" />
          <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-[14px] text-muted">%</span>
        </div>
      </Field>
      {changed && !confirmed ? (
        <div className="rounded-card bg-sun p-3.5 text-[13px] text-sun-ink">
          <p className="font-medium">Mudar a comissão?</p>
          <p className="mt-0.5">Só líderes de vendas ganham mais que 0,4%. Quando você subir de nível, é aqui que a porcentagem muda — até lá, o padrão é o certo.</p>
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant="dark" onClick={() => setConfirmed(true)}>
              Sim, subi de nível
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setValue(current); setConfirmed(false); }}>
              Voltar ao atual
            </Button>
          </div>
        </div>
      ) : null}
      <div className="flex justify-end">
        <SubmitButton size="sm" variant="secondary" disabled={changed && !confirmed}>
          Salvar comissão
        </SubmitButton>
      </div>
    </form>
  );
}

export function AlertsForm({ alerts }: { alerts: AppSettings["alerts"] }) {
  const [state, formAction] = useActionState(saveAlertsAction, IDLE);
  useActionToast(state);
  const errors = formErrors(state);
  const [sound, setSound] = useState<SoundId>((formValue(state, "sound", alerts.sound) || alerts.sound) as SoundId);

  function preview() {
    unlockAudio();
    // O contexto de áudio acorda de forma assíncrona depois do clique; um instante basta.
    window.setTimeout(() => playSound(sound), 60);
  }

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
        <Field label="Som do alerta" htmlFor="sound" error={errors.sound} className="sm:col-span-2">
          <div className="flex gap-2">
            <Select id="sound" name="sound" value={sound} onChange={(e) => setSound(e.target.value as SoundId)} className="flex-1">
              {SOUND_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </Select>
            <Button variant="secondary" size="lg" onClick={preview} disabled={sound === "off"} aria-label="Ouvir o som escolhido">
              <Volume2 className="size-4" aria-hidden />
              Ouvir
            </Button>
          </div>
        </Field>
      </div>
      <div className="flex justify-end">
        <SubmitButton size="sm" variant="secondary">
          Salvar alertas
        </SubmitButton>
      </div>
    </form>
  );
}
