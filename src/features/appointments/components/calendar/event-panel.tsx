"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Clock, MessageCircle, Pencil, Phone, UserRound, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { AppointmentKindChip, AppointmentStatusBadge, ClientPriorityBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { formatDate, formatTime, formatWeekdayShort, fromIso } from "@/lib/dates";
import { telUrl, whatsappUrl } from "@/lib/phone";
import { addMinutes } from "date-fns";
import { QuickStatus } from "../quick-status";
import type { CalendarEvent } from "./types";

type Props = { event: CalendarEvent; onClose: () => void };

/** Detalhe do agendamento clicado na grade: painel lateral no desktop, folha inferior no celular. */
export function EventPanel({ event, onClose }: Props) {
  const start = fromIso(event.start);
  const end = addMinutes(start, event.durationMinutes);
  const pending = event.status === "agendado";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-ink/25 backdrop-blur-[1px]" onClick={onClose} aria-hidden />
      <section
        role="dialog"
        aria-modal="true"
        aria-label={`Agendamento com ${event.clientName}`}
        className="animate-rise fixed z-50 flex flex-col rounded-panel bg-surface shadow-float max-md:inset-x-2 max-md:bottom-2 max-md:max-h-[85dvh] md:top-4 md:right-4 md:bottom-4 md:w-[380px]"
      >
        <div className="flex items-start justify-between gap-3 p-5 pb-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <AppointmentKindChip kind={event.kind} />
              <ClientPriorityBadge priority={event.priority} />
              {!pending ? <AppointmentStatusBadge status={event.status} /> : null}
            </div>
            <h2 className="mt-2 truncate text-[22px] font-medium tracking-tight text-ink">{event.clientName}</h2>
            <p className="mt-0.5 flex items-center gap-1.5 text-[14px] text-ink-2">
              <Clock className="size-4 text-muted" aria-hidden />
              {formatWeekdayShort(start)}, {formatDate(start)} · {formatTime(start)} – {formatTime(end)}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="icon-btn -mt-1 -mr-1 size-9">
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 pb-5">
          {event.notes || event.interestNotes ? (
            <div className="rounded-card bg-surface-2 p-3.5 text-[14px] text-ink-2">
              {event.notes ? <p className="whitespace-pre-wrap text-ink">{event.notes}</p> : null}
              {event.interestNotes ? <p className={event.notes ? "mt-1.5 text-muted" : ""}>{event.interestNotes}</p> : null}
            </div>
          ) : null}

          <div className="flex items-center gap-3">
            <Avatar name={event.leaderName ?? event.clientName} photoKey={event.leaderPhotoKey} size={40} />
            <div className="min-w-0 text-[13px] leading-tight">
              <p className="truncate text-[14px] text-ink">{event.leaderName ?? "Sem líder"}</p>
              <p className="text-muted">{event.leaderName ? "Líder de vendas" : "Defina na página do cliente"}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <a href={whatsappUrl(event.phone)} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center justify-center gap-2 rounded-control bg-lime text-[14px] font-medium text-lime-ink transition-colors hover:bg-lime-soft">
              <MessageCircle className="size-4" aria-hidden />
              WhatsApp
            </a>
            <a href={telUrl(event.phone)} className="inline-flex h-11 items-center justify-center gap-2 rounded-control bg-surface-2 text-[14px] font-medium text-ink transition-colors hover:bg-surface-3">
              <Phone className="size-4" aria-hidden />
              Ligar
            </a>
          </div>

          {pending ? (
            <div>
              <p className="mb-2 text-[12px] font-medium uppercase tracking-wide text-muted">Dar baixa</p>
              <QuickStatus appointmentId={event.id} layout="card" onDone={onClose} />
              <p className="mt-3 text-[12px] text-muted md:hidden">Para remarcar pelo celular, segure o bloco na grade e arraste, ou use Editar.</p>
            </div>
          ) : null}
        </div>

        <div className="flex gap-2 border-t border-line p-3">
          <ButtonLink href={`/clientes/${event.clientId}`} variant="secondary" size="sm" className="flex-1">
            <UserRound className="size-4" aria-hidden />
            Cliente
          </ButtonLink>
          <ButtonLink href={`/agenda/${event.id}/editar`} variant="dark" size="sm" className="flex-1">
            <Pencil className="size-4" aria-hidden />
            Editar
          </ButtonLink>
          <Link href={`/clientes/${event.clientId}`} className="sr-only">
            Abrir cliente
          </Link>
        </div>
      </section>
    </>
  );
}
