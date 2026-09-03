"use client";

import { useActionState, useRef, useState } from "react";
import { CalendarClock, Store, Video } from "lucide-react";
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
  APPOINTMENT_KIND_LABELS,
  ATTENDANCE_APPOINTMENT_KIND,
  ATTENDANCE_LABELS,
  ATTENDANCES,
  CLIENT_STATUS_LABELS,
  CLIENT_STATUSES,
  CLIENT_PRIORITIES,
  CLIENT_PRIORITY_LABELS,
  INTEREST_LABELS,
  INTERESTS,
  SOURCE_LABELS,
  SOURCES,
  type Attendance,
  type Interest,
} from "@/lib/domain";
import { centsToInput } from "@/lib/money";
import { formErrors, formValue, IDLE, type FormState } from "@/lib/result";

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  leaders: Pick<Leader, "id" | "name" | "active">[];
  initial?: Client;
  /** Dia e hora do próximo agendamento pendente (edição): mudar aqui remarca na agenda. */
  initialSchedule?: { day: string; time: string } | null;
  cancelHref: string;
  submitLabel?: string;
};

const LEGEND = "mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted";

export function ClientForm({ action, leaders, initial, initialSchedule, cancelHref, submitLabel = "Salvar cliente" }: Props) {
  const [state, formAction] = useActionState(action, IDLE);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(state, formRef);
  const errors = formErrors(state);
  const value = (key: string, fallback: string | null | undefined) => formValue(state, key, fallback);

  const firstVisitDay = initial?.firstVisitAt ? toLocalInput(fromIso(initial.firstVisitAt)).day : "";
  const isEdit = Boolean(initial);
  const leaderOptions = leaders.filter((l) => l.active || l.id === initial?.leaderId);
  const [attendance, setAttendance] = useState<Attendance>(value("attendance", initial?.attendance ?? "presencial") as Attendance);
  const [interest, setInterest] = useState<Interest | "">(value("interest", initial?.interest ?? "") as Interest | "");
  const isCustomInterest = interest === "outro";
  const scheduleKind = APPOINTMENT_KIND_LABELS[ATTENDANCE_APPOINTMENT_KIND[attendance]].toLowerCase();

  return (
    <form ref={formRef} action={formAction} noValidate className="space-y-8">
      <FormAlert state={state} />

      <fieldset className="space-y-4">
        <legend className={LEGEND}>Contato</legend>
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
        <AttendancePicker value={attendance} onChange={setAttendance} />
      </fieldset>

      <fieldset className="space-y-4">
        <legend className={LEGEND}>Interesse e líder</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Interesse" htmlFor="interest" required error={errors.interest}>
            <Select id="interest" name="interest" value={interest} onChange={(e) => setInterest(e.target.value as Interest | "")} invalid={Boolean(errors.interest)}>
              <option value="">Escolha…</option>
              {INTERESTS.map((i) => (
                <option key={i} value={i}>
                  {INTEREST_LABELS[i]}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label={isCustomInterest ? "Qual é o interesse?" : "Detalhe do interesse"}
            htmlFor="interestNotes"
            required={isCustomInterest}
            error={errors.interestNotes}
            hint={isCustomInterest ? "Escreva o que o cliente quer. Ex.: Investimento, terreno, caminhão" : "Ex.: apartamento na zona sul, SUV até 120 mil"}
          >
            <Input id="interestNotes" name="interestNotes" defaultValue={value("interestNotes", initial?.interestNotes)} invalid={Boolean(errors.interestNotes)} placeholder={isCustomInterest ? "Ex.: Investimento" : "opcional"} />
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
          <Field label="Prioridade" htmlFor="priority" error={errors.priority} hint="Use Urgente para o que precisa saltar aos olhos; Pode adiar para o que pode esperar.">
            <Select id="priority" name="priority" defaultValue={value("priority", initial?.priority ?? "normal")}>
              {CLIENT_PRIORITIES.map((priority) => <option key={priority} value={priority}>{CLIENT_PRIORITY_LABELS[priority]}</option>)}
            </Select>
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className={LEGEND}>Valores</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Valor da carta" htmlFor="credit" error={errors.credit} hint="Crédito pretendido. Ex.: 300.000,00">
            <MoneyInput id="credit" name="credit" defaultValue={value("credit", centsToInput(initial?.creditCents))} invalid={Boolean(errors.credit)} placeholder="0,00" />
          </Field>
          <Field label="Adesão (entrada)" htmlFor="adesao" error={errors.adesao} hint="Quanto o cliente tem para entrar. Combine já no primeiro contato.">
            <MoneyInput id="adesao" name="adesao" defaultValue={value("adesao", centsToInput(initial?.adesaoCents))} invalid={Boolean(errors.adesao)} placeholder="0,00" />
          </Field>
          <Field label="Parcela de" htmlFor="installmentMin" error={errors.installmentMin} hint="Faixa que cabe no bolso. Preencha só o “até” para parcela fixa.">
            <MoneyInput id="installmentMin" name="installmentMin" defaultValue={value("installmentMin", centsToInput(initial?.installmentMinCents))} invalid={Boolean(errors.installmentMin)} placeholder="0,00" />
          </Field>
          <Field label="Parcela até" htmlFor="installmentMax" error={errors.installmentMax}>
            <MoneyInput id="installmentMax" name="installmentMax" defaultValue={value("installmentMax", centsToInput(initial?.installmentMaxCents))} invalid={Boolean(errors.installmentMax)} placeholder="0,00" />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className={LEGEND}>Quando o cliente vem</legend>
        <div className="rounded-card bg-surface-2 p-4">
          <p className="flex items-center gap-2 text-[13px] text-ink-2">
            <CalendarClock className="size-4 shrink-0 text-accent" aria-hidden />
            {isEdit && initialSchedule
              ? `Dia e hora do próximo encontro marcado. Mudar aqui remarca na agenda; para cancelar, use a agenda.`
              : `Com dia e hora, o sistema já marca ${scheduleKind} na agenda e manda o cliente para “Agendado”.`}
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Field label="Data" htmlFor="scheduleDay" error={errors.scheduleDay}>
              <Input id="scheduleDay" name="scheduleDay" type="date" defaultValue={value("scheduleDay", initialSchedule?.day ?? "")} invalid={Boolean(errors.scheduleDay)} />
            </Field>
            <Field label="Horário" htmlFor="scheduleTime" error={errors.scheduleTime}>
              <Input id="scheduleTime" name="scheduleTime" type="time" step={300} defaultValue={value("scheduleTime", initialSchedule?.time ?? "")} invalid={Boolean(errors.scheduleTime)} />
            </Field>
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className={LEGEND}>Mais</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Primeiro atendimento" htmlFor="firstVisitDay" error={errors.firstVisitDay} hint="Dia em que já falou com o líder. Vazio se ainda não aconteceu.">
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

/** Presencial ou online: controla também o tipo do agendamento criado no cadastro. */
function AttendancePicker({ value, onChange }: { value: Attendance; onChange: (next: Attendance) => void }) {
  return (
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
              <input type="radio" name="attendance" value={a} checked={value === a} onChange={() => onChange(a)} className="absolute inset-0 cursor-pointer appearance-none opacity-0" />
              <Icon className="size-4" aria-hidden />
              {ATTENDANCE_LABELS[a]}
            </label>
          );
        })}
      </div>
      <p className="mt-1.5 text-[13px] text-muted">Presencial: você traz o cliente à loja. Online: cliente de longe, tudo por videochamada.</p>
    </div>
  );
}
