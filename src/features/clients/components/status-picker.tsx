"use client";

import { useFormStatus } from "react-dom";
import { Select } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { CLIENT_STATUS_LABELS, CLIENT_STATUS_TONE, CLIENT_STATUSES, type ClientStatus } from "@/lib/domain";
import { setClientStatusAction } from "../actions";

const TONE_TEXT: Record<string, string> = {
  neutral: "text-stone-700",
  info: "text-sky-800",
  accent: "text-accent-ink",
  warning: "text-amber-800",
  success: "text-emerald-800",
  danger: "text-rose-800",
};

/** Select que salva ao mudar (sem botão): status do funil do cliente. */
export function StatusPicker({ id, status }: { id: string; status: ClientStatus }) {
  return (
    // `key` força o remount quando o status muda no servidor (select não controlado).
    <form key={status} action={setClientStatusAction}>
      <input type="hidden" name="id" value={id} />
      <StatusSelect status={status} />
    </form>
  );
}

function StatusSelect({ status }: { status: ClientStatus }) {
  const { pending } = useFormStatus();
  return (
    <Select
      name="status"
      aria-label="Status do cliente"
      defaultValue={status}
      disabled={pending}
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
      className={cn("font-semibold", TONE_TEXT[CLIENT_STATUS_TONE[status]])}
    >
      {CLIENT_STATUSES.map((s) => (
        <option key={s} value={s}>
          {CLIENT_STATUS_LABELS[s]}
        </option>
      ))}
    </Select>
  );
}
