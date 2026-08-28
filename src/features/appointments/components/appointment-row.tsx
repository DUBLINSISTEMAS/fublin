import Link from "next/link";
import { MessageCircle, Pencil, Phone } from "lucide-react";
import { AppointmentKindChip, AppointmentStatusBadge, Chip } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { formatCountdown, formatRelativeDay, formatTime, fromIso } from "@/lib/dates";
import { APPOINTMENT_KIND_LABELS, APPOINTMENT_KIND_SHORT } from "@/lib/domain";
import { telUrl, whatsappUrl } from "@/lib/phone";
import { meetingLabel, meetingOrdinal } from "../sequence";
import type { AppointmentWithClient } from "../queries";
import { QuickStatus } from "./quick-status";
import type { AppointmentVariant } from "./variant";

type Props = {
  appointment: AppointmentWithClient;
  now: Date;
  variant?: AppointmentVariant;
  showDay?: boolean;
  /** Na página do próprio cliente o nome é redundante: mostra o tipo no lugar. */
  hideClient?: boolean;
};

const TIME_TONE: Record<AppointmentVariant, string> = {
  now: "text-accent-ink",
  overdue: "text-sun-ink",
  default: "text-ink",
  done: "text-ink",
};

/**
 * Linha de agendamento (agenda do dia e página do cliente): hora à esquerda,
 * chip do tipo, nome, contexto e ações. Enquanto "agendado", oferece baixa rápida.
 */
export function AppointmentRow({ appointment, now, variant = "default", showDay = false, hideClient = false }: Props) {
  const when = fromIso(appointment.scheduledAt);
  const { client } = appointment;
  const pending = appointment.status === "agendado";
  const isDone = variant === "done" || !pending;
  const subtitle = appointment.notes ?? (hideClient ? null : client.interestNotes);
  // Sem o nome do cliente o tipo já vira o título; com o nome, o chip só aparece quando a hora sozinha não basta.
  const showKindChip = pending && !hideClient && (showDay || variant === "now");
  const underTime = showDay ? formatRelativeDay(when, now) : variant === "now" ? formatCountdown(when, now) : APPOINTMENT_KIND_SHORT[appointment.kind];
  // "3ª visita à loja": na página do cliente vira o próprio título; na agenda, um chip ao lado do nome.
  const meeting = appointment.meetingNumber ? { ordinal: meetingOrdinal(appointment.meetingNumber), label: meetingLabel(appointment.meetingNumber, appointment.kind) } : null;

  return (
    <li className={cn("flex gap-3 px-4 py-4 sm:gap-4 sm:px-5", variant === "now" && "bg-sky/50", isDone && "opacity-70")}>
      <div className="w-14 shrink-0 pt-0.5">
        <p className={cn("text-[17px] font-medium tabular-nums tracking-tight", TIME_TONE[variant])}>{formatTime(when)}</p>
        <p className="text-[11px] text-muted">{underTime}</p>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {hideClient ? (
            <span className="text-[16px] font-medium text-ink">{meeting?.label ?? APPOINTMENT_KIND_LABELS[appointment.kind]}</span>
          ) : (
            <Link href={`/clientes/${client.id}`} className="truncate text-[16px] font-medium text-ink hover:underline">
              {client.name}
            </Link>
          )}
          {!pending ? <AppointmentStatusBadge status={appointment.status} className="h-6 text-[12px]" /> : null}
          {showKindChip ? <AppointmentKindChip kind={appointment.kind} className="h-6 text-[12px]" /> : null}
          {meeting && !hideClient ? (
            <Chip className="h-6 bg-surface-3 text-[12px] text-ink-2" title={meeting.label}>
              {meeting.ordinal}
            </Chip>
          ) : null}
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
          {pending ? <QuickStatus appointmentId={appointment.id} layout="row" /> : null}
        </div>
      </div>
    </li>
  );
}
