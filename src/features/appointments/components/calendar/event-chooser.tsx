"use client";

import { useEffect } from "react";
import { Layers, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { ClientPriorityBadge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { formatTime, fromIso } from "@/lib/dates";
import { APPOINTMENT_KIND_LABELS } from "@/lib/domain";
import { plural } from "@/lib/text";
import { addMinutes } from "date-fns";
import { KIND_DOT } from "./styles";
import type { CalendarEvent } from "./types";

type Props = { events: CalendarEvent[]; onPick: (event: CalendarEvent) => void; onClose: () => void };

/** Dois ou mais clientes no mesmo horário: escolha qual abrir. */
export function EventChooser({ events, onPick, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-ink/25 backdrop-blur-[1px]" onClick={onClose} aria-hidden />
      <section role="dialog" aria-modal="true" aria-label="Escolher agendamento" className="animate-rise fixed inset-x-3 top-1/2 z-50 mx-auto max-w-md -translate-y-1/2 rounded-panel bg-surface p-4 shadow-float sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-[15px] font-medium text-ink">
              <Layers className="size-4 text-accent" aria-hidden />
              {plural(events.length, "agendamento")} no mesmo horário
            </p>
            <p className="mt-0.5 text-[13px] text-muted">Qual você quer ver?</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="icon-btn -mt-1 -mr-1 size-9">
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <ul className="mt-3 divide-y divide-line">
          {events.map((e) => {
            const start = fromIso(e.start);
            return (
              <li key={e.id}>
                <button type="button" onClick={() => onPick(e)} className="flex w-full cursor-pointer items-center gap-3 rounded-[10px] px-2 py-2.5 text-left transition-colors hover:bg-surface-2">
                  <span className={cn("size-2.5 shrink-0 rounded-full", KIND_DOT[e.kind])} aria-hidden />
                  <span className="w-[92px] shrink-0 text-[13px] tabular-nums text-muted">
                    {formatTime(start)} – {formatTime(addMinutes(start, e.durationMinutes))}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium text-ink">{e.clientName}</span>
                    <ClientPriorityBadge priority={e.priority} className="mt-1 h-5 px-1.5 text-[10px]" />
                    <span className="block truncate text-[12px] text-muted">
                      {APPOINTMENT_KIND_LABELS[e.kind]}
                      {e.leaderName ? ` · ${e.leaderName}` : ""}
                    </span>
                  </span>
                  <Avatar name={e.leaderName ?? e.clientName} photoKey={e.leaderPhotoKey} size={28} />
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
