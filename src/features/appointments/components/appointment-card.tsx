import Link from "next/link";
import { CalendarDays, MessageCircle, MoreHorizontal, Phone } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { AppointmentKindChip, AppointmentStatusBadge, Chip, ClientPriorityBadge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { formatCountdown, formatScheduleDay, formatTime, fromIso } from "@/lib/dates";
import { APPOINTMENT_KIND_LABELS } from "@/lib/domain";
import { telUrl, whatsappUrl } from "@/lib/phone";
import { meetingLabel, meetingOrdinal } from "../sequence";
import type { AppointmentWithClient } from "../queries";
import { QuickStatus } from "./quick-status";
import type { AppointmentVariant } from "./variant";

type Props = { appointment: AppointmentWithClient; now: Date; variant?: AppointmentVariant };

/**
 * Card de agendamento no estilo kanban: chip do tipo, nome, contexto,
 * avatar do cliente, horário e baixa rápida. "Agora" ganha fundo azul-claro.
 */
export function AppointmentCard({ appointment, now, variant = "default" }: Props) {
  const when = fromIso(appointment.scheduledAt);
  const { client } = appointment;
  const pending = appointment.status === "agendado";
  const isNow = variant === "now";
  const context = appointment.notes ?? client.interestNotes;
  const meeting = appointment.meetingNumber ? { ordinal: meetingOrdinal(appointment.meetingNumber), label: meetingLabel(appointment.meetingNumber, appointment.kind) } : null;

  return (
    <article className={cn("rounded-card p-4 shadow-card", isNow ? "bg-sky" : "bg-surface", variant === "done" && "opacity-70")}>
      <div className="flex items-start justify-between gap-2">
        <span className="flex flex-wrap items-center gap-1.5">
          {!pending ? (
            <AppointmentStatusBadge status={appointment.status} />
          ) : isNow && appointment.kind === "visita" ? (
            // Sobre o fundo azul-claro do "Agora", o chip azul da visita vira escuro para não sumir.
            <Chip className="bg-dark text-white">{APPOINTMENT_KIND_LABELS.visita}</Chip>
          ) : (
            <AppointmentKindChip kind={appointment.kind} />
          )}
          {meeting ? (
            <Chip className={cn("h-7 text-[12px]", isNow ? "bg-white/60 text-ink-2" : "bg-surface-2 text-ink-2")} title={meeting.label}>
              {meeting.ordinal}
            </Chip>
          ) : null}
          <ClientPriorityBadge priority={client.priority} />
        </span>
        <Link href={`/agenda/${appointment.id}/editar`} className="icon-btn -mt-1 -mr-1 size-8" aria-label="Editar agendamento">
          <MoreHorizontal className="size-4" aria-hidden />
        </Link>
      </div>

      <Link href={`/clientes/${client.id}`} className="mt-3 block text-[17px] font-medium leading-tight text-ink hover:underline">
        {client.name}
      </Link>
      {context ? <p className={cn("mt-1 line-clamp-2 text-[13px] leading-snug", isNow ? "text-ink-2" : "text-muted")}>{context}</p> : null}

      <div className={cn("mt-3 flex items-center rounded-control p-2.5", isNow ? "bg-white/55" : "bg-surface-2")}>
        <CalendarDays className={cn("mr-2.5 size-5 shrink-0", isNow ? "text-sky-ink" : "text-accent-ink")} aria-hidden />
        <span className="min-w-0 flex-1 border-r border-current/10 pr-2">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Dia</span>
          <span className="block truncate text-[14px] font-semibold leading-tight text-ink">{formatScheduleDay(when, now)}</span>
        </span>
        <span className="shrink-0 pl-2.5 text-right">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Horário</span>
          <span className="block text-[20px] font-semibold leading-tight tabular-nums tracking-tight text-ink">{formatTime(when)}</span>
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2.5">
        <Avatar name={client.leader?.name ?? client.name} photoKey={client.leader?.photoKey} size={32} tone={isNow ? "white" : "accent"} />
        <div className="min-w-0 text-[12px] leading-tight">
          <p className="truncate text-ink">{client.leader?.name ?? "Sem líder"}</p>
          <p className={isNow ? "text-ink-2" : "text-muted"}>{client.leader ? "Líder de vendas" : "Definir na loja"}</p>
        </div>
      </div>

      <div className={cn("mt-3 flex items-center justify-between gap-2 border-t pt-3", isNow ? "border-ink/10" : "border-line")}>
        <span className={cn("text-[12px] font-medium", isNow ? "text-sky-ink" : "text-muted")}>{isNow ? formatCountdown(when, now) : APPOINTMENT_KIND_LABELS[appointment.kind]}</span>
        <span className="flex items-center gap-0.5">
          <a href={whatsappUrl(client.phone)} target="_blank" rel="noreferrer" className="icon-btn size-8" aria-label={`WhatsApp de ${client.name}`}>
            <MessageCircle className="size-4" aria-hidden />
          </a>
          <a href={telUrl(client.phone)} className="icon-btn size-8" aria-label={`Ligar para ${client.name}`}>
            <Phone className="size-4" aria-hidden />
          </a>
        </span>
      </div>

      {pending ? <QuickStatus appointmentId={appointment.id} layout="card" tinted={isNow} /> : null}
    </article>
  );
}
