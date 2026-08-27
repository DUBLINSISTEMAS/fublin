"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ActionError } from "@/components/ui/action-error";
import { Input, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/cn";
import { CLIENT_STATUS_HINTS, CLIENT_STATUS_LABELS, CLIENT_STATUS_TONE, CLIENT_STATUSES, type ClientStatus, type Tone } from "@/lib/domain";
import { OK } from "@/lib/result";
import { setClientStatusAction } from "../actions";

const TONE_TEXT: Record<Tone, string> = {
  neutral: "text-ink-2",
  info: "text-sky-ink",
  accent: "text-accent-ink",
  warning: "text-sun-ink",
  success: "text-lime-ink",
  danger: "text-rose-ink",
};

type Props = { id: string; status: ClientStatus; lostReason: string | null };

/** Etapa do funil: select que salva ao mudar; em "perdido", pede o motivo. */
export function StatusPicker({ id, status, lostReason }: Props) {
  const [state, formAction] = useActionState(setClientStatusAction, OK);
  return (
    <div className="space-y-3">
      {/* `key` força o remount quando o status muda no servidor (select não controlado). */}
      <form key={status} action={formAction}>
        <input type="hidden" name="id" value={id} />
        <StatusSelect status={status} />
      </form>
      <p className="text-[13px] text-muted">{CLIENT_STATUS_HINTS[status]}</p>
      {status === "perdido" ? (
        <form action={formAction} className="flex gap-2">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="status" value="perdido" />
          <Input name="lostReason" aria-label="Motivo da perda" defaultValue={lostReason ?? ""} placeholder="Motivo (ex.: fechou com concorrente)" className="h-10 text-[14px]" />
          <SubmitButton size="sm" variant="secondary" className="h-10 shrink-0">
            Salvar
          </SubmitButton>
        </form>
      ) : null}
      <ActionError state={state} />
    </div>
  );
}

function StatusSelect({ status }: { status: ClientStatus }) {
  const { pending } = useFormStatus();
  return (
    <Select
      name="status"
      aria-label="Etapa do funil"
      defaultValue={status}
      disabled={pending}
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
      className={cn("font-medium", TONE_TEXT[CLIENT_STATUS_TONE[status]])}
    >
      {CLIENT_STATUSES.map((s) => (
        <option key={s} value={s}>
          {CLIENT_STATUS_LABELS[s]}
        </option>
      ))}
    </Select>
  );
}
