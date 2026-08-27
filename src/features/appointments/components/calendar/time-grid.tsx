"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/cn";
import { dayBounds, dayKey, formatTime, formatWeekdayShort, fromIso, type DayKey } from "@/lib/dates";
import { addMinutes } from "date-fns";
import { EventPanel } from "./event-panel";
import { GRID_HEIGHT_PX, HOUR_HEIGHT_PX, HOURS, layoutEvents, minutesFromGridStart, PX_PER_MINUTE, type Positioned } from "./layout";
import { KIND_BORDER } from "./styles";
import type { CalendarEvent } from "./types";

type Props = { days: DayKey[]; events: CalendarEvent[]; today: DayKey; /** Dia escolhido na URL: no celular a semana abre nele. */ focusDay: DayKey; nowIso: string };

type Timed = { start: Date; durationMinutes: number; event: CalendarEvent };

const pad = (n: number) => String(n).padStart(2, "0");
/** Largura da régua de horas, que fica fixa à esquerda enquanto as colunas rolam. */
const GUTTER_PX = 56;

/**
 * Grade de horas × dias (estilo Google Agenda): blocos por duração, linha vermelha do
 * "agora", clique num horário vazio abre o cadastro já com dia e hora. No celular, as
 * colunas rolam de lado com encaixe — a semana vira um "dia de cada vez".
 */
export function TimeGrid({ days, events, today, focusDay, nowIso }: Props) {
  const [now, setNow] = useState(() => new Date(nowIso));
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  // A linha do "agora" nasce com a hora do servidor (sem divergir na hidratação) e anda a cada minuto.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  // No celular (colunas maiores que a tela), abre já no dia escolhido em vez de segunda-feira.
  useEffect(() => {
    const el = scroller.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    const column = el.querySelector<HTMLElement>(`[data-day="${focusDay}"]`);
    if (column) el.scrollLeft = column.offsetLeft - GUTTER_PX;
  }, [focusDay, days]);

  const byDay = new Map<DayKey, Timed[]>();
  for (const e of events) {
    const start = fromIso(e.start);
    const key = dayKey(start);
    byDay.set(key, [...(byDay.get(key) ?? []), { start, durationMinutes: e.durationMinutes, event: e }]);
  }
  const nowTop = minutesFromGridStart(now) * PX_PER_MINUTE;
  const single = days.length === 1;

  return (
    <div className="rounded-panel bg-surface shadow-panel">
      <div ref={scroller} className="overflow-x-auto snap-x snap-mandatory scroll-pl-14 rounded-panel no-scrollbar md:snap-none">
        <div className="flex min-w-max md:min-w-0">
          {/* Régua das horas */}
          <div className="sticky left-0 z-20 w-14 shrink-0 bg-surface">
            <div className="h-[72px] border-b border-line" />
            <div className="relative" style={{ height: GRID_HEIGHT_PX }}>
              {HOURS.map((h) => (
                <span key={h} className="absolute right-2 -translate-y-1/2 text-[11px] tabular-nums text-muted" style={{ top: (h - HOURS[0]) * HOUR_HEIGHT_PX }}>
                  {h === HOURS[0] ? "" : `${pad(h)}:00`}
                </span>
              ))}
              {days.includes(today) ? (
                <span className="absolute right-1 z-10 -translate-y-1/2 rounded-md bg-rose-ink px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-white" style={{ top: nowTop }}>
                  {formatTime(now)}
                </span>
              ) : null}
            </div>
          </div>

          {days.map((day) => {
            const date = dayBounds(day).start;
            const isToday = day === today;
            const positioned = layoutEvents(byDay.get(day) ?? []);
            return (
              <div key={day} data-day={day} className={cn("shrink-0 snap-start border-l border-line", single ? "w-[calc(100vw-4.5rem)] md:w-auto md:flex-1" : "w-[76vw] md:w-auto md:flex-1", "md:min-w-0")}>
                <div className={cn("flex h-[72px] items-center gap-2 border-b border-line px-3", single && "gap-3")}>
                  <span className={cn("text-[11px] font-medium uppercase tracking-wide", isToday ? "text-accent" : "text-muted")}>{formatWeekdayShort(date)}</span>
                  <span className={cn("grid size-9 place-items-center rounded-full text-[20px] font-medium tabular-nums", isToday ? "bg-accent text-white" : "text-ink")}>{date.getDate()}</span>
                  {single ? <span className="text-[13px] text-muted">{positioned.length ? `${positioned.length} na grade` : "Dia livre"}</span> : null}
                </div>
                <div className="relative" style={{ height: GRID_HEIGHT_PX }}>
                  {HOURS.map((h) => (
                    <Link
                      key={h}
                      href={`/agenda/novo?d=${day}&h=${pad(h)}:00`}
                      aria-label={`Agendar em ${day} às ${pad(h)}:00`}
                      className="group absolute inset-x-0 border-t border-line transition-colors hover:bg-accent-soft/40"
                      style={{ top: (h - HOURS[0]) * HOUR_HEIGHT_PX, height: HOUR_HEIGHT_PX }}
                    >
                      <span className="pointer-events-none absolute top-1 left-2 hidden items-center gap-1 rounded-md bg-surface px-1.5 py-0.5 text-[11px] font-medium text-accent-ink shadow-card group-hover:inline-flex">
                        <Plus className="size-3" aria-hidden />
                        {pad(h)}:00
                      </span>
                    </Link>
                  ))}
                  {positioned.map((p) => (
                    <EventBlock key={p.item.event.id} positioned={p} onSelect={() => setSelected(p.item.event)} />
                  ))}
                  {isToday ? (
                    <div className="pointer-events-none absolute inset-x-0 z-10 flex items-center" style={{ top: nowTop }} aria-hidden>
                      <span className="-ml-[5px] size-2.5 rounded-full bg-rose-ink" />
                      <span className="h-px flex-1 bg-rose-ink" />
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {selected ? <EventPanel event={selected} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}

function EventBlock({ positioned: p, onSelect }: { positioned: Positioned<Timed>; onSelect: () => void }) {
  const { event } = p.item;
  const end = addMinutes(p.item.start, event.durationMinutes);
  const done = event.status === "realizado";
  const missed = event.status === "faltou";
  const cancelled = event.status === "cancelado";
  const tall = p.height >= 64;
  const wide = p.lanes === 1;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`${event.clientName}, ${formatTime(p.item.start)} até ${formatTime(end)}`}
      className={cn(
        "absolute z-[5] cursor-pointer overflow-hidden rounded-[10px] border border-line border-l-4 bg-surface p-1.5 text-left shadow-card transition-shadow hover:z-[6] hover:shadow-float",
        missed ? "border-l-rose-ink" : cancelled ? "border-l-line-strong" : KIND_BORDER[event.kind],
        (done || cancelled) && "opacity-60",
        cancelled && "line-through",
      )}
      style={{ top: p.top, height: p.height, left: `calc(${(p.lane / p.lanes) * 100}% + 4px)`, width: `calc(${100 / p.lanes}% - 8px)` }}
    >
      <p className="truncate text-[10px] tabular-nums text-muted">
        {formatTime(p.item.start)} – {formatTime(end)}
      </p>
      <p className="truncate text-[13px] font-medium leading-tight text-ink">{event.clientName}</p>
      {tall && (event.notes || event.interestNotes) ? <p className="mt-0.5 truncate text-[11px] text-muted">{event.notes ?? event.interestNotes}</p> : null}
      {tall && wide && p.height >= 96 ? (
        <span className="absolute bottom-1.5 left-1.5">
          <Avatar name={event.leaderName ?? event.clientName} photoKey={event.leaderPhotoKey} size={22} />
        </span>
      ) : null}
    </button>
  );
}
