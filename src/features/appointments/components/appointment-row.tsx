import Link from "next/link";
import { Check, MessageCircle, Pencil, Phone, UserX } from "lucide-react";
import { AppointmentStatusBadge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { formatCountdown, formatRelativeDay, formatTime, fromIso } from "@/lib/dates";
import { APPOINTMENT_KIND_LABELS, APPOINTMENT_KIND_SHORT } from "@/lib/domain";
import { telUrl, whatsappUrl } from "@/lib/phone";
import { setAppointmentStatusAction } from "../actions";
import type { AppointmentWithClient } from "../queries";

export type RowVariant = "now" | "default" | "overdue" | "done";

type Props = {
  appointment: AppointmentWithClient;
  now: Date;
  variant?: RowVariant;
  showDay?: boolean;
  /** Na página do próprio cliente o nome é redundante: mostra o tipo no lugar. */
  hideClient?: boolean;
};

const ACCENT_BAR: Record<RowVariant, string> = {
  now: "before:bg-accent",
  default: "before:bg-transparent",
  overdue: "before:bg-amber-400",
  done: "before:bg-transparent",
};

/**
 * Linha de agendamento: hora à esquerda, cliente no centro, ações à direita.
 * Enquanto está "agendado", oferece baixa rápida (Realizado / Faltou).
 */
export function AppointmentRow({ appointment, now, variant = "default", showDay = false, hideClient = false }: Props) {
  const when = fromIso(appointment.scheduledAt);
  const { client } = appointment;
  const pending = appointment.status === "agendado";
  const isDone = variant === "done" || !pending;
  const kindLabel = APPOINTMENT_KIND_LABELS[appointment.kind];
  const subtitle = [hideClient || showDay || variant === "now" ? (hideClient ? null : kindLabel) : null, appointment.notes ?? (hideClient ? null : client.interestNotes)]
    .filter(Boolean)
    .join(" · ");

  return (
    <li
      className={cn(
        "relative flex gap-3 py-3.5 pl-4 pr-3 before:absolute before:top-3 before:bottom-3 before:left-0 before:w-0.5 before:rounded-full sm:gap-4 sm:pl-5",
        ACCENT_BAR[variant],
        isDone && "opacity-70",
      )}
    >
      <div className="w-14 shrink-0 pt-0.5">
        <p className={cn("text-[15px] font-semibold tabular-nums tracking-tight", variant === "now" ? "text-accent" : "text-ink")}>{formatTime(when)}</p>
        <p className="text-[11px] text-muted">
          {showDay ? formatRelativeDay(when, now) : variant === "now" ? formatCountdown(when, now) : APPOINTMENT_KIND_SHORT[appointment.kind]}
        </p>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {hideClient ? (
            <span className="truncate text-[15px] font-medium text-ink">{kindLabel}</span>
          ) : (
            <Link href={`/clientes/${client.id}`} className="truncate text-[15px] font-medium text-ink hover:underline">
              {client.name}
            </Link>
          )}
          {!pending ? <AppointmentStatusBadge status={appointment.status} /> : null}
        </div>
        {subtitle ? <p className="mt-0.5 truncate text-[13px] text-muted">{subtitle}</p> : null}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <a href={whatsappUrl(client.phone)} target="_blank" rel="noreferrer" className="icon-btn" aria-label={`WhatsApp de ${client.name}`}>
            <MessageCircle className="size-4" aria-hidden />
          </a>
          <a href={telUrl(client.phone)} className="icon-btn" aria-label={`Ligar para ${client.name}`}>
            <Phone className="size-4" aria-hidden />
          </a>
          <Link href={`/agenda/${appointment.id}/editar`} className="icon-btn" aria-label="Editar agendamento">
            <Pencil className="size-4" aria-hidden />
          </Link>
          {pending ? (
            <form action={setAppointmentStatusAction} className="ml-auto flex items-center gap-1.5">
              <input type="hidden" name="id" value={appointment.id} />
              <button type="submit" name="status" value="realizado" className="quick-btn quick-btn-ok">
                <Check className="size-3.5" aria-hidden />
                Realizado
              </button>
              <button type="submit" name="status" value="faltou" className="quick-btn">
                <UserX className="size-3.5" aria-hidden />
                Faltou
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </li>
  );
}
