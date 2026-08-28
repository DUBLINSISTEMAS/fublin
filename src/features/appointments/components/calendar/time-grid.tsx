"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { toast } from "@/components/ui/toast";
import { readZoom } from "@/components/ui/zoom";
import { cn } from "@/lib/cn";
import { dayBounds, dayKey, formatRelativeDay, formatTime, formatWeekdayShort, fromIso, type DayKey } from "@/lib/dates";
import { addMinutes } from "date-fns";
import { rescheduleAppointmentAction } from "../../actions";
import { EventChooser } from "./event-chooser";
import { EventPanel } from "./event-panel";
import { GRID_HEIGHT_PX, HOUR_HEIGHT_PX, HOUR_START, HOURS, layoutEvents, minutesFromGridStart, PX_PER_MINUTE, snapMinutes, type Positioned } from "./layout";
import { KIND_BORDER } from "./styles";
import type { CalendarEvent } from "./types";

type Props = { days: DayKey[]; events: CalendarEvent[]; today: DayKey; /** Dia escolhido na URL: no celular a semana abre nele. */ focusDay: DayKey; nowIso: string };

type Timed = { start: Date; durationMinutes: number; event: CalendarEvent };

const pad = (n: number) => String(n).padStart(2, "0");
/** Largura da régua de horas, que fica fixa à esquerda enquanto as colunas rolam. */
const GUTTER_PX = 56;
/** Menos que isso é clique, não arrasto. */
const DRAG_THRESHOLD_PX = 5;
/** No toque, segurar este tempo parado começa o arrasto (antes disso o dedo rola a tela). */
const LONG_PRESS_MS = 350;
/** Deslocamento de cada card numa pilha (clientes no mesmo horário). */
const STACK_OFFSET_PX = 10;

type Drag = {
  id: string;
  durationMinutes: number;
  /** Onde o dedo/mouse pegou o bloco, em minutos a partir do topo do bloco. */
  grabMinutes: number;
  startX: number;
  startY: number;
  moved: boolean;
  /** Posição-alvo enquanto arrasta. */
  dayIndex: number;
  minutes: number;
  columns: { left: number; right: number; top: number }[];
  /** Pixels da tela por pixel do layout (a interface pode estar em 85%). */
  scale: number;
};

type TouchPending = { timer: number; x: number; y: number; el: HTMLElement; onTouchMove: (ev: TouchEvent) => void; activated: boolean };

/** Instante correspondente a um dia da grade + minutos desde o início dela. */
function gridDate(day: DayKey, minutes: number): Date {
  return addMinutes(dayBounds(day).start, HOUR_START * 60 + minutes);
}

/**
 * Grade de horas × dias (estilo Google Agenda): blocos por duração, linha vermelha do
 * "agora", clique num horário vazio abre o cadastro já com dia e hora, arrastar remarca
 * (mouse direto; no toque, segure o bloco), clientes no mesmo horário viram uma pilha
 * com escolha. No celular as colunas rolam de lado com encaixe — um dia de cada vez.
 */
export function TimeGrid({ days, events: serverEvents, today, focusDay, nowIso }: Props) {
  const [now, setNow] = useState(() => new Date(nowIso));
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  const [chooser, setChooser] = useState<CalendarEvent[] | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [, startTransition] = useTransition();
  const scroller = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const touchRef = useRef<TouchPending | null>(null);

  // Estado otimista: o bloco já aparece no horário novo antes do servidor confirmar.
  const [events, setEvents] = useState(serverEvents);
  const [seen, setSeen] = useState(serverEvents);
  if (serverEvents !== seen) {
    setSeen(serverEvents);
    setEvents(serverEvents);
  }

  // A linha do "agora" nasce com a hora do servidor (sem divergir na hidratação) e anda a cada minuto.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  // Em telas estreitas (colunas maiores que a área), abre já no dia escolhido em vez de segunda-feira.
  useEffect(() => {
    const el = scroller.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    const column = el.querySelector<HTMLElement>(`[data-day="${focusDay}"]`);
    if (!column) return;
    // Posição relativa ao scroller (não ao offsetParent), em pixels do layout.
    const zoom = readZoom();
    const left = (column.getBoundingClientRect().left - el.getBoundingClientRect().left) / zoom + el.scrollLeft - GUTTER_PX;
    el.scrollTo({ left: Math.max(0, left) });
  }, [focusDay, days]);

  const byDay = new Map<DayKey, Timed[]>();
  for (const e of events) {
    const start = fromIso(e.start);
    const key = dayKey(start);
    byDay.set(key, [...(byDay.get(key) ?? []), { start, durationMinutes: e.durationMinutes, event: e }]);
  }
  const nowTop = minutesFromGridStart(now) * PX_PER_MINUTE;
  const single = days.length === 1;

  function open(event: CalendarEvent, group: CalendarEvent[]) {
    if (group.length > 1) setChooser(group);
    else setSelected(event);
  }

  /** Mede as colunas e arma o arrasto (chamado na hora, no mouse, ou depois da pressão longa, no toque). */
  function startDrag(el: HTMLElement, p: Positioned<Timed>, clientX: number, clientY: number) {
    const root = scroller.current;
    if (!root) return;
    const columns = days.map((day) => {
      const rect = root.querySelector<HTMLElement>(`[data-day="${day}"] [data-grid]`)!.getBoundingClientRect();
      return { left: rect.left, right: rect.right, top: rect.top, height: rect.height };
    });
    const scale = columns[0] ? columns[0].height / GRID_HEIGHT_PX : 1;
    const blockTop = el.getBoundingClientRect().top;
    dragRef.current = {
      id: p.item.event.id,
      durationMinutes: p.item.durationMinutes,
      grabMinutes: (clientY - blockTop) / scale / PX_PER_MINUTE,
      startX: clientX,
      startY: clientY,
      moved: false,
      dayIndex: days.indexOf(dayKey(p.item.start)),
      minutes: minutesFromGridStart(p.item.start),
      columns,
      scale,
    };
  }

  function clearTouch() {
    const t = touchRef.current;
    if (!t) return;
    window.clearTimeout(t.timer);
    t.el.removeEventListener("touchmove", t.onTouchMove);
    touchRef.current = null;
  }

  function beginDrag(e: React.PointerEvent<HTMLButtonElement>, p: Positioned<Timed>) {
    if (e.button !== 0) return;
    const el = e.currentTarget;
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      /* eventos sintéticos (testes/automação) não têm ponteiro ativo para capturar */
    }
    if (e.pointerType === "mouse") {
      startDrag(el, p, e.clientX, e.clientY);
      return;
    }
    // Toque: só vira arrasto se o dedo ficar parado; mexer antes disso é rolagem normal.
    clearTouch();
    const pending: TouchPending = {
      x: e.clientX,
      y: e.clientY,
      el,
      activated: false,
      timer: window.setTimeout(() => {
        pending.activated = true;
        startDrag(el, p, pending.x, pending.y);
        if (dragRef.current) dragRef.current.moved = true;
        setDrag(dragRef.current);
        navigator.vibrate?.(30);
      }, LONG_PRESS_MS),
      onTouchMove: (ev: TouchEvent) => {
        if (pending.activated) {
          ev.preventDefault(); // o navegador não pode rolar enquanto o bloco anda com o dedo
          return;
        }
        const t = ev.touches[0];
        if (t && Math.hypot(t.clientX - pending.x, t.clientY - pending.y) > 8) clearTouch();
      },
    };
    el.addEventListener("touchmove", pending.onTouchMove, { passive: false });
    touchRef.current = pending;
  }

  function moveDrag(e: React.PointerEvent<HTMLButtonElement>) {
    const d = dragRef.current;
    if (!d) return;
    if (!d.moved && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < DRAG_THRESHOLD_PX) return;
    let dayIndex = d.columns.findIndex((c) => e.clientX >= c.left && e.clientX <= c.right);
    if (dayIndex === -1) dayIndex = e.clientX < d.columns[0].left ? 0 : d.columns.length - 1;
    const minutes = snapMinutes((e.clientY - d.columns[dayIndex].top) / d.scale / PX_PER_MINUTE - d.grabMinutes, d.durationMinutes);
    const next = { ...d, moved: true, dayIndex, minutes };
    dragRef.current = next;
    setDrag(next);
  }

  function endDrag(p: Positioned<Timed>, group: CalendarEvent[]) {
    const touch = touchRef.current;
    const wasTouchPending = Boolean(touch && !touch.activated);
    clearTouch();
    const d = dragRef.current;
    dragRef.current = null;
    setDrag(null);
    if (wasTouchPending || !d) {
      // Toque curto (sem pressão longa) ou clique: abre.
      if (wasTouchPending || !d) open(p.item.event, group);
      return;
    }
    if (!d.moved) {
      open(p.item.event, group);
      return;
    }
    const when = gridDate(days[d.dayIndex], d.minutes);
    const iso = when.toISOString();
    if (iso === p.item.event.start) return;
    const previous = p.item.event.start;
    setEvents((list) => list.map((ev) => (ev.id === d.id ? { ...ev, start: iso } : ev)));
    startTransition(async () => {
      const result = await rescheduleAppointmentAction(d.id, iso);
      if (!result.ok) {
        setEvents((list) => list.map((ev) => (ev.id === d.id ? { ...ev, start: previous } : ev)));
        toast.error(result.error);
        return;
      }
      toast.success(`${p.item.event.clientName} remarcado: ${formatRelativeDay(when, now)} às ${formatTime(when)}`);
    });
  }

  function cancelDrag() {
    clearTouch();
    dragRef.current = null;
    setDrag(null);
  }

  return (
    <div className="rounded-panel bg-surface shadow-panel">
      <div ref={scroller} className="overflow-x-auto snap-x snap-mandatory scroll-pl-14 rounded-panel no-scrollbar lg:snap-none">
        <div className="flex min-w-max lg:min-w-0">
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

          {days.map((day, dayIndex) => {
            const date = dayBounds(day).start;
            const isToday = day === today;
            const positioned = layoutEvents(byDay.get(day) ?? []);
            const groups = new Map<number, CalendarEvent[]>();
            for (const p of positioned) groups.set(p.group, [...(groups.get(p.group) ?? []), p.item.event]);
            const ghost = drag?.moved && drag.dayIndex === dayIndex ? drag : null;
            return (
              <div key={day} data-day={day} className={cn("shrink-0 snap-start border-l border-line", single ? "w-[calc(100vw-4.5rem)] md:w-auto md:flex-1" : "w-[76vw] md:w-[176px] lg:w-auto lg:flex-1", "lg:min-w-0")}>
                <div className={cn("flex h-[72px] items-center gap-2 border-b border-line px-3", single && "gap-3")}>
                  <span className={cn("text-[11px] font-medium uppercase tracking-wide", isToday ? "text-accent" : "text-muted")}>{formatWeekdayShort(date)}</span>
                  <span className={cn("grid size-9 place-items-center rounded-full text-[20px] font-medium tabular-nums", isToday ? "bg-accent text-white" : "text-ink")}>{date.getDate()}</span>
                  {single ? <span className="text-[13px] text-muted">{positioned.length ? `${positioned.length} na grade` : "Dia livre"}</span> : null}
                </div>
                <div data-grid className="relative" style={{ height: GRID_HEIGHT_PX }}>
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
                    <EventBlock
                      key={p.item.event.id}
                      positioned={p}
                      dragging={drag?.id === p.item.event.id && drag.moved}
                      onPointerDown={(e) => beginDrag(e, p)}
                      onPointerMove={moveDrag}
                      onPointerUp={() => endDrag(p, groups.get(p.group) ?? [p.item.event])}
                      onPointerCancel={cancelDrag}
                    />
                  ))}
                  {ghost ? <GhostBlock day={day} minutes={ghost.minutes} durationMinutes={ghost.durationMinutes} /> : null}
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
      {chooser ? (
        <EventChooser
          events={chooser}
          onPick={(e) => {
            setChooser(null);
            setSelected(e);
          }}
          onClose={() => setChooser(null)}
        />
      ) : null}
      {selected ? <EventPanel event={selected} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}

/** Prévia do horário-alvo enquanto o bloco é arrastado. */
function GhostBlock({ day, minutes, durationMinutes }: { day: DayKey; minutes: number; durationMinutes: number }) {
  const start = gridDate(day, minutes);
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-1 z-20 rounded-[10px] border-2 border-dashed border-accent bg-accent-soft/70 p-1.5 text-[11px] font-medium text-accent-ink"
      style={{ top: minutes * PX_PER_MINUTE, height: Math.max(durationMinutes * PX_PER_MINUTE, 30) }}
    >
      {formatTime(start)} – {formatTime(addMinutes(start, durationMinutes))}
    </div>
  );
}

type BlockProps = {
  positioned: Positioned<Timed>;
  dragging: boolean;
  onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
};

function EventBlock({ positioned: p, dragging, ...handlers }: BlockProps) {
  const { event } = p.item;
  const end = addMinutes(p.item.start, event.durationMinutes);
  const done = event.status === "realizado";
  const missed = event.status === "faltou";
  const cancelled = event.status === "cancelado";
  const tall = p.height >= 64;
  const stacked = p.groupSize > 1;
  const topOfStack = stacked && p.lane === p.lanes - 1;
  return (
    <button
      type="button"
      {...handlers}
      onContextMenu={(e) => e.preventDefault()}
      aria-label={`${event.clientName}, ${formatTime(p.item.start)} até ${formatTime(end)}${stacked ? `, ${p.groupSize} no mesmo horário` : ""}`}
      title={stacked ? "Mais de um cliente neste horário: clique para escolher" : "Clique para abrir, arraste para remarcar (no toque, segure)"}
      className={cn(
        "absolute cursor-grab overflow-hidden rounded-[10px] border border-line border-l-4 bg-surface p-1.5 text-left shadow-card transition-shadow select-none hover:shadow-float active:cursor-grabbing",
        missed ? "border-l-rose-ink" : cancelled ? "border-l-line-strong" : KIND_BORDER[event.kind],
        (done || cancelled) && "opacity-60",
        cancelled && "line-through",
        stacked && "ring-1 ring-line-strong/60",
        dragging && "opacity-40",
      )}
      style={{
        top: p.top,
        height: p.height,
        left: stacked ? 4 + p.lane * STACK_OFFSET_PX : 4,
        right: stacked ? 4 + (p.lanes - 1 - p.lane) * STACK_OFFSET_PX : 4,
        zIndex: 5 + p.lane,
      }}
    >
      <p className="truncate text-[10px] tabular-nums text-muted">
        {formatTime(p.item.start)} – {formatTime(end)}
      </p>
      <p className="truncate text-[13px] font-medium leading-tight text-ink">{event.clientName}</p>
      {tall && (event.notes || event.interestNotes) ? <p className="mt-0.5 truncate text-[11px] text-muted">{event.notes ?? event.interestNotes}</p> : null}
      {tall && !stacked && p.height >= 96 ? (
        <span className="absolute bottom-1.5 left-1.5">
          <Avatar name={event.leaderName ?? event.clientName} photoKey={event.leaderPhotoKey} size={22} />
        </span>
      ) : null}
      {topOfStack ? (
        <span className="absolute top-1 right-1 grid h-5 min-w-5 place-items-center rounded-full bg-dark px-1.5 text-[10px] font-medium tabular-nums text-white" aria-hidden>
          {p.groupSize}
        </span>
      ) : null}
    </button>
  );
}
